import { readdir, readFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { cpus } from "node:os";

const PUZZLES_DIR = join(process.cwd(), "puzzles");
const OUTPUT_DIR = join(process.cwd(), "src/data");
const UNSOLVABLES = join(OUTPUT_DIR, "unsolvables.json");
const WORKER_COUNT = Math.max(1, cpus().length - 1);

interface PuzzleTask {
	puzzleStr: string;
	bankId?: string;
	sourceFile: string;
}

async function generateId(puzzleStr: string): Promise<string> {
	return createHash("sha256").update(puzzleStr).digest("hex").slice(0, 12);
}

function shuffle<T>(array: T[]) {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		const temp = array[i];
		const target = array[j];
		if (temp !== undefined && target !== undefined) {
			array[i] = target;
			array[j] = temp;
		}
	}
}

async function preparePuzzles() {
	const entries = await readdir(PUZZLES_DIR, { withFileTypes: true });
	const tasks: PuzzleTask[] = [];

	const MAX_LINES_FROM_FILE = 100000;
	console.log("Collecting puzzles...");

	for (const entry of entries) {
		const fullPath = join(PUZZLES_DIR, entry.name);

		if (entry.isDirectory()) {
			const files = await readdir(fullPath);
			for (const file of files) {
				const content = await readFile(join(fullPath, file), "utf-8");
				const lines = content.split("\n").filter((l: string) => l.trim().length === 81);
				let lff = 0;
				for (const line of lines) {
					if (lff >= MAX_LINES_FROM_FILE) break;
					lff++;
					tasks.push({
						puzzleStr: line.trim(),
						sourceFile: entry.name,
					});
				}
			}
		} else if (entry.isFile() && entry.name.endsWith(".txt")) {
			const content = await readFile(fullPath, "utf-8");
			const lines = content.trim().split("\n");
			let lff = 0;
			for (const line of lines) {
				if (lff >= MAX_LINES_FROM_FILE) break;
				lff++;
				const parts = line.trim().split(/\s+/);
				const puzzleStr = parts[1];
				const bankId = parts[0];

				if (puzzleStr && puzzleStr.length === 81) {
					tasks.push({
						puzzleStr,
						bankId,
						sourceFile: entry.name,
					});
				}
			}
		}
	}

	console.log(`Collected ${tasks.length} puzzles. Shuffling...`);
	shuffle(tasks);

	const puzzlesByDifficulty: Record<string, Record<string, string>> = {
		easy: {},
		normal: {},
		medium: {},
		hard: {},
		expert: {},
		master: {},
	};
	const unsolvables: Record<string, string[]> = {};

	console.log(`Starting ${WORKER_COUNT} workers...`);
	let processed = 0;
	const LOG_EVERY_N_PUZZLES = 1000;

	const solveInParallel = (): Promise<void> => {
		return new Promise((resolve) => {
			let taskIdx = 0;
			let activeWorkers = 0;

			const startWorker = () => {
				if (taskIdx >= tasks.length) return;

				activeWorkers++;
				const worker = new Worker(join(process.cwd(), "scripts/worker-solver.ts"));

				worker.onmessage = async (event) => {
					const { puzzleStr, bankId, sourceFile, graded, success, error } =
						event.data;

					if (success) {
						if (graded.isSolvable) {
							const diffLabel = getDifficultyLabel(graded.difficulty);
							const puzzles = puzzlesByDifficulty[diffLabel];
							if (puzzles) {
								const id = bankId || (await generateId(puzzleStr));
								puzzles[id] = puzzleStr;
							}
						} else {
							unsolvables[sourceFile] ??= [];
							unsolvables[sourceFile].push(puzzleStr);
						}
					} else {
						console.error(`Worker error: ${error}`);
					}

					processed++;
					if (processed % LOG_EVERY_N_PUZZLES === 0) {
						console.log(`Processed ${processed} puzzles`);
					}

					if (taskIdx < tasks.length) {
						worker.postMessage(tasks[taskIdx++]);
					} else {
						worker.terminate();
						activeWorkers--;
						if (activeWorkers === 0) {
							resolve();
						}
					}
				};

				worker.postMessage(tasks[taskIdx++]);
			};

			for (let i = 0; i < Math.min(WORKER_COUNT, tasks.length); i++) {
				startWorker();
			}
		});
	};

	await solveInParallel();

	// Write individual files
	await mkdir(OUTPUT_DIR, { recursive: true });
	for (const [diff, puzzles] of Object.entries(puzzlesByDifficulty)) {
		const filePath = join(OUTPUT_DIR, `${diff}.json`);
		await Bun.write(filePath, JSON.stringify(puzzles, null, 2));
		console.log(`Saved ${Object.keys(puzzles).length} puzzles to ${filePath}`);
	}
	await Bun.write(UNSOLVABLES, JSON.stringify(unsolvables, null, 2));
	for (const [k, v] of Object.entries(unsolvables)) {
		console.log(`Unsolvable ${k}: ${v.length}`);
	}
}

function getDifficultyLabel(score: number): string {
	if (score < 3.0) return "easy";
	if (score < 4.0) return "normal";
	if (score < 5.0) return "medium";
	if (score < 7.0) return "hard";
	if (score < 9.0) return "expert";
	return "master";
}

preparePuzzles().catch(console.error);
