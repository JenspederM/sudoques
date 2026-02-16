import type { Board } from "../types";

export const EMPTY_BOARD: Board = Array(9)
	.fill(null)
	.map(() => Array(9).fill(null));

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

export function isValid(
	board: Board,
	row: number,
	col: number,
	num: number,
): boolean {
	// Check row
	const currentRow = board[row];
	if (currentRow) {
		for (let x = 0; x < 9; x++) {
			if (currentRow[x] === num) return false;
		}
	}

	// Check column
	for (let x = 0; x < 9; x++) {
		const rowX = board[x];
		if (rowX && rowX[col] === num) return false;
	}

	// Check 3x3 box
	const startRow = row - (row % 3);
	const startCol = col - (col % 3);
	for (let i = 0; i < 3; i++) {
		const boxRow = board[i + startRow];
		if (boxRow) {
			for (let j = 0; j < 3; j++) {
				if (boxRow[j + startCol] === num) return false;
			}
		}
	}

	return true;
}

export function solveSudoku(board: Board): Board | null {
	const newBoard = board.map((row) => [...row]);

	function solve(): boolean {
		for (let row = 0; row < 9; row++) {
			for (let col = 0; col < 9; col++) {
				const currentRow = newBoard[row];
				if (!currentRow) continue;
				if (currentRow[col] === null) {
					for (let num = 1; num <= 9; num++) {
						if (isValid(newBoard, row, col, num)) {
							currentRow[col] = num;
							if (solve()) return true;
							currentRow[col] = null;
						}
					}
					return false;
				}
			}
		}
		return true;
	}

	if (solve()) return newBoard;
	return null;
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
