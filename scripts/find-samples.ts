import { readFileSync } from "fs";
import { join } from "path";
import { parsePuzzle } from "../src/logic/sudoku";
import { gradePuzzle } from "../src/logic/solver";

const FILE = "src/data/puzzles_graded.json";
const SAMPLE_SIZE = 5000;

async function findTechniqueSamples() {
	console.log(`Searching for technique samples in ${FILE}...`);
	const filePath = join(process.cwd(), FILE);
	const data = JSON.parse(readFileSync(filePath, "utf-8"));
	
	const samples: Record<string, string[]> = {};

	for (const diff in data) {
		const puzzles = data[diff];
		for (const puzzleStr of puzzles.slice(0, SAMPLE_SIZE)) {
			const graded = gradePuzzle(parsePuzzle(puzzleStr));
			
			if (graded.isSolvable) {
				for (const tech of graded.techniquesUsed) {
					if (!samples[tech]) samples[tech] = [];
					if (samples[tech].length < 3) {
						samples[tech].push(puzzleStr);
					}
				}
			}
		}
	}

	for (const [tech, puzzles] of Object.entries(samples)) {
		console.log(`\nTechnique: ${tech}`);
		puzzles.forEach(p => console.log(`  ${p}`));
	}
}

findTechniqueSamples().catch(console.error);
