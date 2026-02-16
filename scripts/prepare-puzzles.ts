import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const PUZZLES_DIR = join(process.cwd(), "puzzles");
const OUTPUT_FILE = join(process.cwd(), "src/data/puzzles.json");

async function preparePuzzles() {
	const entries = await readdir(PUZZLES_DIR, { withFileTypes: true });
	const result: Record<string, string[]> = {
		easy: [],
		normal: [],
		medium: [],
		hard: [],
		expert: [],
		master: [],
	};

	const BANK_MAPPING: Record<string, string> = {
		"easy.txt": "easy",
		"medium.txt": "medium",
		"hard.txt": "hard",
		"diabolical.txt": "expert",
	};

	const MAX_SAMPLE = 5000;

	for (const entry of entries) {
		const fullPath = join(PUZZLES_DIR, entry.name);

		if (entry.isDirectory()) {
			// Old structure: puzzles/difficulty/file
			const files = await readdir(fullPath);
			const allPuzzles: string[] = [];

			for (const file of files) {
				const content = await readFile(join(fullPath, file), "utf-8");
				const lines = content.split("\n").filter((l) => l.trim().length === 81);
				allPuzzles.push(...lines);
			}

			const label = entry.name.toLowerCase();
			if (result[label]) {
				result[label].push(...allPuzzles);
			} else {
				// For numeric directories (25, 27, etc.), we map to easy for now or keep them
				// actually let's just keep them if they don't match our main labels
				result[label] = allPuzzles;
			}
		} else if (entry.isFile() && BANK_MAPPING[entry.name]) {
			// New Bank format: ID String Rating
			const content = await readFile(fullPath, "utf-8");
			const lines = content.trim().split("\n");
			const puzzles: string[] = [];

			for (const line of lines) {
				const parts = line.trim().split(/\s+/);
				const puzzleStr = parts[1];
				if (!puzzleStr) continue; // Ensure puzzle string exists
				// const bankRating = parseFloat(parts[2] || "0"); // This line was in the diff but not used, so omitting it.
				if (parts.length >= 2 && puzzleStr.length === 81) {
					puzzles.push(puzzleStr);
				}
			}

			const label = BANK_MAPPING[entry.name];
			if (label && result[label]) {
				result[label].push(...puzzles);
			}
		}
	}

	// Shuffle and sample all categories
	for (const diff of Object.keys(result)) {
		const all = result[diff];
		if (!all) continue;
		
		// Simple shuffle and slice
		result[diff] = all
			.sort(() => Math.random() - 0.5)
			.slice(0, MAX_SAMPLE);

		console.log(`Finalized ${result[diff].length} puzzles for difficulty ${diff}`);
	}

	await Bun.write(OUTPUT_FILE, JSON.stringify(result, null, 2));
	console.log(`Puzzles saved to ${OUTPUT_FILE}`);
}

preparePuzzles().catch(console.error);
