import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Board, CellNotes, DBBoard, DBCellNotes, Puzzle } from "@/types";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

const unflatten = <T>(arr: T[]): T[][] => {
	const result: T[][] = [];
	for (let i = 0; i < 9; i++) {
		result.push(arr.slice(i * 9, (i + 1) * 9));
	}
	return result;
};

export function unflattenBoard(arr: DBBoard): Board {
	return unflatten(arr);
}

export function unflattenCellNotes(arr: DBCellNotes): CellNotes {
	const notesArray: Set<number>[] = Array.from({ length: 81 }, () => new Set());

	// Check if notes exist and are in the expected format
	const notesData = arr;

	if (notesData) {
		for (const [key, values] of Object.entries(notesData)) {
			const idx = parseInt(key, 10);
			if (idx >= 0 && idx < 81) {
				notesArray[idx] = new Set(values);
			}
		}
	}

	return unflatten(notesArray) as CellNotes;
}

export const formatTime = (s: number) => {
	const mins = Math.floor(s / 60);
	const secs = Math.floor(s % 60);
	return `${mins}:${secs.toString().padStart(2, "0")}`;
};

/**
 * Builds the state object passed via react-router when navigating to the review page.
 */
export function buildReviewState(opts: {
	puzzle: Puzzle;
	time: number;
	actions: unknown[];
}) {
	return {
		initial: opts.puzzle.initial.flat(),
		solution: opts.puzzle.solution.flat(),
		difficulty: opts.puzzle.difficulty,
		score: opts.puzzle.score,
		techniques: opts.puzzle.techniques,
		techniqueAnalysis: opts.puzzle.techniqueAnalysis,
		actions: opts.actions,
		time: opts.time,
	};
}
