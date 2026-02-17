import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import type { PuzzleData } from "./types";

const DATA_DIR = join(process.cwd(), "src/data");
const COLLECTION_NAME = "puzzles";
const BATCH_SIZE = 500;
let MAX_PUZZLES_PER_DIFFICULTY = 5000;
if (process.env.NODE_ENV !== "production") {
	MAX_PUZZLES_PER_DIFFICULTY = 10;
}

async function uploadPuzzles() {
	console.log("Initializing Firebase Admin...");

	try {
		if (process.env.NODE_ENV !== "production") {
			// Connect to the emulator
			process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
			initializeApp({ projectId: "sudoques" });
			console.log("Connected to Firestore Emulator");
		} else {
			// Production: uses service account key file
			const serviceAccountPath = join(
				process.cwd(),
				"sudoques-firebase-adminsdk-fbsvc-faea9b143b.json",
			);
			const serviceAccount = JSON.parse(
				await readFile(serviceAccountPath, "utf-8"),
			);
			initializeApp({
				credential: cert(serviceAccount),
				projectId: "sudoques",
			});
		}
	} catch (error) {
		console.error("Failed to initialize Firebase Admin:", error);
		process.exit(1);
	}

	const db = getFirestore();
	let total = 0;

	const files = (await readdir(DATA_DIR)).filter(
		(f) => f.endsWith(".json") && f !== "unsolvables.json",
	);

	for (const file of files) {
		const difficulty = file.replace(".json", "");
		console.log(`Processing ${file} (${difficulty})...`);
		const content = await readFile(join(DATA_DIR, file), "utf-8");
		const puzzles = JSON.parse(content) as Record<string, PuzzleData>;
		const allEntries = Object.entries(puzzles);

		let entries = allEntries;
		if (MAX_PUZZLES_PER_DIFFICULTY > 0) {
			entries = allEntries.slice(0, MAX_PUZZLES_PER_DIFFICULTY);
			console.log(
				`Uploading ${entries.length}/${allEntries.length} puzzles for ${difficulty}...`,
			);
		} else {
			console.log(
				`Uploading all ${entries.length} puzzles for ${difficulty}...`,
			);
		}

		total += entries.length;

		for (let i = 0; i < entries.length; i += BATCH_SIZE) {
			const batch = db.batch();
			const chunk = entries.slice(i, i + BATCH_SIZE);

			for (const [id, data] of chunk) {
				const puzzleRef = db.collection(COLLECTION_NAME).doc(id);
				batch.set(puzzleRef, {
					puzzle: data.puzzle,
					solution: data.solution,
					difficulty: difficulty,
					score: data.score,
					techniques: data.techniques,
					updatedAt: new Date(),
				});
			}

			await batch.commit();
			console.log(
				`  Uploaded ${Math.min(i + BATCH_SIZE, entries.length)}/${entries.length}...`,
			);
		}
		console.log(`Done with ${difficulty}`);
	}
	console.log(`${total} puzzles uploaded successfully!`);
}

uploadPuzzles().catch(console.error);
