import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { classifyDifficulty } from "../src/logic/difficulty";
import type { Difficulty, Technique } from "../src/types";
import type { PuzzleData } from "./types";

const DATA_DIR = join(process.cwd(), "src/data");
const DIFFICULTIES = [
	"easy",
	"normal",
	"medium",
	"hard",
	"expert",
	"master",
] as const satisfies readonly Difficulty[];

const reclassified = Object.fromEntries(
	DIFFICULTIES.map((difficulty) => [difficulty, {}]),
) as Record<Difficulty, Record<string, PuzzleData>>;

for (const sourceDifficulty of DIFFICULTIES) {
	const sourcePath = join(DATA_DIR, `${sourceDifficulty}.json`);
	const puzzles = JSON.parse(await readFile(sourcePath, "utf8")) as Record<
		string,
		PuzzleData
	>;

	for (const [id, puzzle] of Object.entries(puzzles)) {
		const techniques = new Set(puzzle.techniques as Technique[]);
		const difficulty = classifyDifficulty(techniques);
		reclassified[difficulty][id] = puzzle;
	}
}

for (const difficulty of DIFFICULTIES) {
	const outputPath = join(DATA_DIR, `${difficulty}.json`);
	await Bun.write(
		outputPath,
		JSON.stringify(reclassified[difficulty], null, 2),
	);
	console.log(
		`${difficulty}: ${Object.keys(reclassified[difficulty]).length} puzzles`,
	);
}
