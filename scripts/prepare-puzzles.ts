import { readdir, readFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { parsePuzzle } from "../src/logic/sudoku";
import { gradePuzzle } from "../src/logic/solver";

const PUZZLES_DIR = join(process.cwd(), "puzzles");
const OUTPUT_DIR = join(process.cwd(), "src/data");
const UNSOLVABLES = join(OUTPUT_DIR, "unsolvables.json");

async function generateId(puzzleStr: string): Promise<string> {
	return createHash("sha256").update(puzzleStr).digest("hex").slice(0, 12);
}

async function preparePuzzles() {
	const entries = await readdir(PUZZLES_DIR, { withFileTypes: true });
	const puzzlesByDifficulty: Record<string, Record<string, string>> = {
		easy: {},
		normal: {},
		medium: {},
		hard: {},
		expert: {},
		master: {},
	};
	const unsolvables: Record<string, string[]> = {};

	let processed = 0
	const MAX_LINES_FROM_FILE=3000;
	const LOG_EVERY_N_PUZZLES=1000;

	console.log("Ingesting and grading puzzles...");

	for (const entry of entries) {
		const fullPath = join(PUZZLES_DIR, entry.name);

		if (entry.isDirectory()) {
			// Old structure: puzzles/<ignored_label>/file
			const files = await readdir(fullPath);
			for (const file of files) {
				const content = await readFile(join(fullPath, file), "utf-8");
				const lines = content.split("\n").filter((l) => l.trim().length === 81);
				let lff = 0
				for (const line of lines) {
					if (lff >= MAX_LINES_FROM_FILE) break;
					processed++;
					lff++;
					const puzzleStr = line.trim();
					const board = parsePuzzle(puzzleStr);
					const graded = gradePuzzle(board);
					
					if (graded.isSolvable) {
						const diffLabel = getDifficultyLabel(graded.difficulty);
						const puzzles = puzzlesByDifficulty[diffLabel];
						if (!puzzles) continue;
						const id = await generateId(puzzleStr);
						puzzles[id] = puzzleStr;
					}	else {
						unsolvables[entry.name] ??= [];
						unsolvables[entry.name].push(puzzleStr);
					}

					if (processed % LOG_EVERY_N_PUZZLES === 0) {
						console.log(`Processed ${processed} puzzles`);
					}
				}
			}
		} else if (entry.isFile() && entry.name.endsWith(".txt")) {
			// Bank format: ID String Rating
			const content = await readFile(fullPath, "utf-8");
			const lines = content.trim().split("\n");
			let lff = 0
			for (const line of lines) {
				if (lff >= MAX_LINES_FROM_FILE) break;
				processed++;
				lff++;
				const parts = line.trim().split(/\s+/);
				const puzzleStr = parts[1];
				const bankId = parts[0];
				
				if (puzzleStr && puzzleStr.length === 81) {
					const board = parsePuzzle(puzzleStr);
					const graded = gradePuzzle(board);
					
					if (graded.isSolvable) {
						const diffLabel = getDifficultyLabel(graded.difficulty);
						const puzzles = puzzlesByDifficulty[diffLabel];
						if (!puzzles) continue;
						const id = bankId || await generateId(puzzleStr);
						puzzles[id] = puzzleStr;
					} else {
						unsolvables[entry.name] ??= [];
						unsolvables[entry.name].push(puzzleStr);
					}
				}
				if (processed % LOG_EVERY_N_PUZZLES === 0) {
					console.log(`Processed ${processed} puzzles`);
				}
			}
		}
	}

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
