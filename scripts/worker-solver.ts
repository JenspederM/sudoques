import { parsePuzzle } from "../src/logic/sudoku";
import { gradePuzzle } from "../src/logic/solver";

// @ts-ignore
declare var self: Worker;

self.onmessage = (event: MessageEvent) => {
	const { puzzleStr, bankId, sourceFile } = event.data;
	try {
		const board = parsePuzzle(puzzleStr);
		const graded = gradePuzzle(board);
		self.postMessage({
			puzzleStr,
			bankId,
			sourceFile,
			graded,
			success: true,
		});
	} catch (error) {
		self.postMessage({
			puzzleStr,
			bankId,
			sourceFile,
			success: false,
			error: error instanceof Error ? error.message : String(error),
		});
	}
};
