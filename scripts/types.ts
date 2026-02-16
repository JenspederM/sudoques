import type { GradedBoard } from "@/logic/solver";
import type { DBPuzzle } from "@/types";

type WorkerResponseSuccess = {
    success: true;
    graded: GradedBoard;
    error?: never;
}
type WorkerResponseError = {
    success: false;
    error: string;
    graded?: never;
}

export type WorkerResponse = WorkerRequest & (WorkerResponseSuccess | WorkerResponseError);

export type WorkerRequest = {
    puzzleStr: string;
    bankId?: string;
    sourceFile: string;
}

export type PuzzleData = Omit<DBPuzzle, "id" | "updatedAt" | "difficulty">