import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const PUZZLES_DIR = join(process.cwd(), "puzzles");
const OUTPUT_FILE = join(process.cwd(), "src/data/puzzles.json");

async function preparePuzzles() {
	const difficulties = await readdir(PUZZLES_DIR);
	const result: Record<string, string[]> = {};

	for (const diff of difficulties) {
		const diffDir = join(PUZZLES_DIR, diff);
		const files = await readdir(diffDir);
		const allPuzzles: string[] = [];

		for (const file of files) {
			const content = await readFile(join(diffDir, file), "utf-8");
			const lines = content.split("\n").filter((l) => l.trim().length === 81);
			allPuzzles.push(...lines);
		}

		// Shuffle and sample
		result[diff] = allPuzzles;
		console.log(`Loaded ${result[diff].length} puzzles for difficulty ${diff}`);
	}

	await Bun.write(OUTPUT_FILE, JSON.stringify(result, null, 2));
	console.log(`Puzzles saved to ${OUTPUT_FILE}`);
}

preparePuzzles().catch(console.error);
