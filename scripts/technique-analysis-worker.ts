import { analyzeLogicalTechniques } from "../src/logic/solver";
import { parsePuzzle } from "../src/logic/sudoku";
import type { LogicalTechniqueAnalysis } from "../src/types";

export type TechniqueAnalysisWorkerRequest = {
	id: string;
	puzzle: string;
};

export type TechniqueAnalysisWorkerResponse =
	| {
			id: string;
			success: true;
			analysis: LogicalTechniqueAnalysis;
	  }
	| { id: string; success: false; error: string };

declare var self: Worker;

self.onmessage = (event: MessageEvent<TechniqueAnalysisWorkerRequest>) => {
	const { id, puzzle } = event.data;
	try {
		self.postMessage({
			id,
			success: true,
			analysis: analyzeLogicalTechniques(parsePuzzle(puzzle)),
		} satisfies TechniqueAnalysisWorkerResponse);
	} catch (error) {
		self.postMessage({
			id,
			success: false,
			error: error instanceof Error ? error.message : String(error),
		} satisfies TechniqueAnalysisWorkerResponse);
	}
};
