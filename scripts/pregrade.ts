import fs from "node:fs";
import path from "node:path";
import { parsePuzzle } from "../src/logic/sudoku";
import { gradePuzzle } from "../src/logic/solver";

const INPUT_FILE = path.join(process.cwd(), "src/data/puzzles.json");
const OUTPUT_FILE = path.join(process.cwd(), "src/data/puzzles_graded.json");

function main() {
	try {
		console.log("Loading puzzles...");
		if (!fs.existsSync(INPUT_FILE)) {
			throw new Error(`Input file not found: ${INPUT_FILE}`);
		}
		const data = JSON.parse(fs.readFileSync(INPUT_FILE, "utf-8"));
		const gradedPuzzles: Record<string, string[]> = {
			easy: [],
			normal: [],
			medium: [],
			hard: [],
			expert: [],
			master: [],
		};

		let count = 0;
		let total = 0;
		for (const key in data) {
			total += data[key].length;
		}

		console.log(`Grading ${total} puzzles...`);

		for (const key in data) {
			let countInCategory = 0;
			for (const puzzleStr of data[key]) {
				const board = parsePuzzle(puzzleStr);
				const graded = gradePuzzle(board);

				let label: keyof typeof gradedPuzzles = "easy";
				const diff = graded.difficulty;
				
				if (diff >= 9) label = "master";        // Extreme
				else if (diff >= 7) label = "expert";   // Diabolical
				else if (diff >= 5) label = "hard";     // Tough
				else if (diff >= 4) label = "medium";   // Moderate
				else if (diff >= 3) label = "normal";   // Gentle
				else label = "easy";                    // Kids

				gradedPuzzles[label]?.push(puzzleStr);
				count++;
				countInCategory++;
				if (count % 100 === 0) {
					console.log(`Graded ${count} puzzles...`);
				}
			}
		}

		console.log("Saving graded puzzles...");
		fs.writeFileSync(OUTPUT_FILE, JSON.stringify(gradedPuzzles, null, 2));

		console.log("Done!");
		for (const key in gradedPuzzles) {
			console.log(`${key}: ${gradedPuzzles[key]?.length} puzzles`);
		}
	} catch (error) {
		console.error("FAILED to grade puzzles:", error);
	}
}

main();
