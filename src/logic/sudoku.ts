import type { Board, CellNotes } from "@/types";

/**
 * Creates a fresh 9×9 grid of empty note Sets.
 */
export function createEmptyNotes(): CellNotes {
	return Array.from({ length: 9 }, () =>
		Array.from({ length: 9 }, () => new Set<number>()),
	);
}

/**
 * Returns true when every cell in `current` matches `solution`.
 */
export function isBoardComplete(current: Board, solution: Board): boolean {
	return current.every((row, ri) =>
		row.every((val, ci) => {
			const solRow = solution[ri];
			return solRow ? val === solRow[ci] : false;
		}),
	);
}

/**
 * Counts how many times each number appears on the board.
 */
export function countValues(board: Board): Map<number, number> {
	const counts = new Map<number, number>();
	for (const row of board) {
		for (const val of row) {
			if (val !== null) {
				counts.set(val, (counts.get(val) || 0) + 1);
			}
		}
	}
	return counts;
}

export function parsePuzzle(puzzleStr: string): Board {
	const board: Board = [];
	const chars = puzzleStr.split("");
	for (let i = 0; i < 9; i++) {
		const row: (number | null)[] = [];
		for (let j = 0; j < 9; j++) {
			const char = chars[i * 9 + j];
			row.push(char === "0" || char === undefined ? null : parseInt(char, 10));
		}
		board.push(row);
	}
	return board;
}

export function checkBoard(
	current: Board,
	solution: Board,
): { row: number; col: number }[] {
	const conflicts: { row: number; col: number }[] = [];
	for (let r = 0; r < 9; r++) {
		const currentRow = current[r];
		const solutionRow = solution[r];
		if (!currentRow || !solutionRow) continue;
		for (let c = 0; c < 9; c++) {
			if (currentRow[c] !== null && currentRow[c] !== solutionRow[c]) {
				conflicts.push({ row: r, col: c });
			}
		}
	}
	return conflicts;
}

export function boardToString(board: Board): string {
	return board
		.flat()
		.map((val) => (val === null ? "." : val.toString()))
		.join("");
}

export function getRandomHint(
	current: Board,
	solution: Board,
	initial: Board,
): { r: number; c: number; v: number } | null {
	const candidates: { r: number; c: number; v: number }[] = [];
	for (let r = 0; r < 9; r++) {
		const currentRow = current[r];
		const solutionRow = solution[r];
		const initialRow = initial[r];
		if (!currentRow || !solutionRow || !initialRow) continue;
		for (let c = 0; c < 9; c++) {
			if (initialRow[c] !== null) continue;
			const targetValue = solutionRow[c];
			if (
				currentRow[c] !== targetValue &&
				targetValue !== null &&
				targetValue !== undefined
			) {
				candidates.push({ r, c, v: targetValue });
			}
		}
	}
	if (candidates.length === 0) return null;
	const item = candidates[Math.floor(Math.random() * candidates.length)];
	return item ?? null;
}

export function getDisabledNumbers(counts: Map<number, number>): number[] {
	return Array.from(counts.entries())
		.filter(([_, count]) => count >= 9)
		.map(([num]) => num);
}

export function getRemainingCounts(
	counts: Map<number, number>,
): Map<number, number> {
	return new Map<number, number>(
		[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => [n, 9 - (counts.get(n) || 0)]),
	);
}
