import type { Board, CellNotes } from "../types";

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
