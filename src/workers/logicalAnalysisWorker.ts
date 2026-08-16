import { analyzeLogicalTechniques } from "@/logic/solver";
import type { Board, LogicalTechniqueAnalysis } from "@/types";

type AnalysisRequest = {
	requestId: number;
	board: Board;
};

type AnalysisResponse = {
	requestId: number;
	analysis?: LogicalTechniqueAnalysis;
	error?: string;
};

type WorkerScope = {
	onmessage: ((event: MessageEvent<AnalysisRequest>) => void) | null;
	postMessage: (response: AnalysisResponse) => void;
};

const workerScope = self as unknown as WorkerScope;

workerScope.onmessage = (event) => {
	const { requestId, board } = event.data;
	try {
		workerScope.postMessage({
			requestId,
			analysis: analyzeLogicalTechniques(board),
		});
	} catch (error) {
		workerScope.postMessage({
			requestId,
			error: error instanceof Error ? error.message : String(error),
		});
	}
};
