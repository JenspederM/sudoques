import { readFileSync } from "fs";
import { join } from "path";
import { parsePuzzle } from "../src/logic/sudoku";
import { gradePuzzle } from "../src/logic/solver";

const FILES = ["easy.txt", "medium.txt", "hard.txt", "diabolical.txt"];
const SAMPLE_SIZE = 100;

async function verifyBank() {
	console.log("Verifying Sudoku Exchange Puzzle Bank Samples...");
	console.log("-----------------------------------------------");

	for (const fileName of FILES) {
		const filePath = join(process.cwd(), "puzzles", fileName);
		let content: string;
		try {
			content = readFileSync(filePath, "utf-8");
		} catch (e) {
			console.error(`Could not read ${fileName}: ${e}`);
			continue;
		}

		const lines = content.trim().split("\n");
		console.log(`\nProcessing ${fileName} (${lines.length} puzzles)...`);

		// Shuffle and sample
		const sampledLines = lines
			.sort(() => 0.5 - Math.random()) // Simple shuffle
			.slice(0, SAMPLE_SIZE);

		let totalBankRating = 0;
		let totalInternalRating = 0;
		let solvableCount = 0;
		const techCounts: Record<string, number> = {};

		for (const line of sampledLines) {
			const parts = line.trim().split(/\s+/);
			if (parts.length < 3) continue;

			const puzzleStr = parts[1];
			if (!puzzleStr) continue;
			const bankRating = parseFloat(parts[2] || "0");

			const board = parsePuzzle(puzzleStr!);
			const graded = gradePuzzle(board);

			totalBankRating += bankRating;
			totalInternalRating += graded.difficulty;
			if (graded.isSolvable) solvableCount++;

			for (const tech of graded.techniquesUsed) {
				techCounts[tech] = (techCounts[tech] || 0) + 1;
			}
		}

		const avgBank = totalBankRating / SAMPLE_SIZE;
		const avgInternal = totalInternalRating / SAMPLE_SIZE;

		console.log(`Results for ${fileName}:`);
		console.log(`  Sample Size: ${SAMPLE_SIZE}`);
		console.log(`  Solvable: ${solvableCount}/${SAMPLE_SIZE}`);
		console.log(`  Avg Bank Rating: ${avgBank.toFixed(2)}`);
		console.log(`  Avg Internal Rating: ${avgInternal.toFixed(2)}`);
		console.log(`  Correlation: ${(avgInternal / avgBank).toFixed(2)}x`);

		const sortedTechs = Object.entries(techCounts)
			.sort(([, a], [, b]) => b - a)
			.slice(0, 5);

		console.log(`  Top 5 Techniques:`);
		for (const [tech, count] of sortedTechs) {
			console.log(`    - ${tech}: ${count}`);
		}
	}
}

verifyBank().catch(console.error);
