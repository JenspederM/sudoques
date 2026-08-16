import { readFile } from "node:fs/promises";
import { cpus } from "node:os";
import { join } from "node:path";
import { cert, deleteApp, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import type { LogicalTechniqueAnalysis } from "../src/types";
import type {
	TechniqueAnalysisWorkerRequest,
	TechniqueAnalysisWorkerResponse,
} from "./technique-analysis-worker";

const COLLECTION_NAME = "puzzles";
const WRITE_BATCH_SIZE = 500;
const WORKER_COUNT = Math.max(1, cpus().length - 1);

async function initializeFirebase() {
	if (process.env.NODE_ENV !== "production") {
		process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
		const app = initializeApp({ projectId: "sudoques" });
		console.log("Connected to Firestore Emulator");
		return app;
	}

	const serviceAccountPath = join(
		process.cwd(),
		"sudoques-firebase-adminsdk-fbsvc-faea9b143b.json",
	);
	const serviceAccount = JSON.parse(
		await readFile(serviceAccountPath, "utf-8"),
	);
	return initializeApp({
		credential: cert(serviceAccount),
		projectId: "sudoques",
	});
}

function analyzeAllPuzzles(tasks: TechniqueAnalysisWorkerRequest[]) {
	return new Promise<Map<string, LogicalTechniqueAnalysis>>(
		(resolve, reject) => {
			if (tasks.length === 0) {
				resolve(new Map());
				return;
			}

			const results = new Map<string, LogicalTechniqueAnalysis>();
			const workers = new Set<Worker>();
			let nextTask = 0;
			let completed = 0;
			let failed = false;

			const stopWithError = (error: Error) => {
				if (failed) return;
				failed = true;
				for (const worker of workers) worker.terminate();
				reject(error);
			};

			const assignNext = (worker: Worker) => {
				const task = tasks[nextTask++];
				if (!task) {
					worker.terminate();
					workers.delete(worker);
					if (!failed && completed === tasks.length) resolve(results);
					return;
				}
				worker.postMessage(task);
			};

			for (
				let index = 0;
				index < Math.min(WORKER_COUNT, tasks.length);
				index++
			) {
				const worker = new Worker(
					join(process.cwd(), "scripts/technique-analysis-worker.ts"),
				);
				workers.add(worker);
				worker.onerror = (error) =>
					stopWithError(new Error(`Analysis worker failed: ${error.message}`));
				worker.onmessage = (
					event: MessageEvent<TechniqueAnalysisWorkerResponse>,
				) => {
					if (failed) return;
					const response = event.data;
					if (!response.success) {
						stopWithError(
							new Error(`Puzzle ${response.id}: ${response.error}`),
						);
						return;
					}
					results.set(response.id, response.analysis);
					completed++;
					if (completed % 100 === 0 || completed === tasks.length) {
						console.log(`Analyzed ${completed}/${tasks.length}`);
					}
					assignNext(worker);
				};
				assignNext(worker);
			}
		},
	);
}

async function migrateTechniqueAnalysis() {
	const app = await initializeFirebase();
	const db = getFirestore();
	if (process.env.NODE_ENV !== "production") {
		db.settings({ universeDomain: "googleapis.com" });
	}
	try {
		const snapshot = await db.collection(COLLECTION_NAME).get();
		const tasks: TechniqueAnalysisWorkerRequest[] = snapshot.docs.map((doc) => {
			const puzzle = doc.get("puzzle");
			if (typeof puzzle !== "string" || puzzle.length !== 81) {
				throw new Error(`Puzzle ${doc.id} has invalid source data`);
			}
			return { id: doc.id, puzzle };
		});

		console.log(
			`Analyzing all ${tasks.length} stored puzzles with ${Math.min(WORKER_COUNT, tasks.length)} workers...`,
		);
		const analyses = await analyzeAllPuzzles(tasks);

		let written = 0;
		const entries = Array.from(analyses.entries());
		for (let index = 0; index < entries.length; index += WRITE_BATCH_SIZE) {
			const batch = db.batch();
			const chunk = entries.slice(index, index + WRITE_BATCH_SIZE);
			for (const [id, techniqueAnalysis] of chunk) {
				batch.update(db.collection(COLLECTION_NAME).doc(id), {
					techniqueAnalysis,
				});
			}
			await batch.commit();
			written += chunk.length;
			console.log(`Updated ${written}/${entries.length}`);
		}
		console.log("Technique-analysis migration complete.");
	} finally {
		await db.terminate();
		await deleteApp(app);
	}
}

migrateTechniqueAnalysis().catch((error) => {
	console.error(error);
	process.exit(1);
});
