import type { DBPuzzle, GradedBoard, LogicalTechniqueAnalysis } from "@/types";

type WorkerResponseSuccess = {
	success: true;
	graded: GradedBoard;
	techniqueAnalysis?: LogicalTechniqueAnalysis;
	error?: never;
};
type WorkerResponseError = {
	success: false;
	error: string;
	graded?: never;
	techniqueAnalysis?: never;
};

export type WorkerResponse = WorkerRequest &
	(WorkerResponseSuccess | WorkerResponseError);

export type WorkerRequest = {
	puzzleStr: string;
	bankId?: string;
	sourceFile: string;
	analyzeTechniques?: boolean;
};

export type PuzzleData = Omit<DBPuzzle, "id" | "updatedAt" | "difficulty">;
