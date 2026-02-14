import { describe, expect, test } from "bun:test";
import { checkBoard, isValid, parsePuzzle, solveSudoku } from "./sudoku";

describe("Sudoku Logic", () => {
	const samplePuzzle =
		"096040001100060004504810390007950043030080000405023018010630059059070830003590007";
	const board = parsePuzzle(samplePuzzle);

	test("parsePuzzle should create a 9x9 board", () => {
		expect(board.length).toBe(9);
		const row0 = board[0];
		if (!row0) throw new Error("Board has no rows");
		expect(row0.length).toBe(9);
		expect(row0[0]).toBeNull();
		expect(row0[1]).toBe(9);
	});

	test("isValid should correctly identify valid and invalid moves", () => {
		// In the first row of samplePuzzle, board[0][0] is null.
		// Row 0 has: null, 9, 6, null, 4, null, null, null, 1
		// Number 9 already exists in row 0, so 9 should be invalid at [0][0].
		expect(isValid(board, 0, 0, 9)).toBe(false);
		// Number 2 is not in row 0, col 0, or the first box.
		expect(isValid(board, 0, 0, 2)).toBe(true);
	});

	test("solveSudoku should find a valid solution", () => {
		const solution = solveSudoku(board);
		expect(solution).not.toBeNull();
		if (solution) {
			// Basic check: no nulls in solution
			const hasNull = solution.some((row) => row.some((val) => val === null));
			expect(hasNull).toBe(false);
		}
	});

	test("checkBoard should identify incorrect numbers", () => {
		const solution = solveSudoku(board);
		if (!solution) throw new Error("Could not solve sudoku");
		const workingBoard = board.map((r) => [...r]);

		// Put a wrong number in an empty spot
		const solutionRow0 = solution[0];
		const workingRow0 = workingBoard[0];
		if (!solutionRow0 || !workingRow0) throw new Error("Rows missing");
		workingRow0[0] = solutionRow0[0] === 1 ? 2 : 1;

		const conflicts = checkBoard(workingBoard, solution);
		expect(conflicts.length).toBe(1);
		expect(conflicts[0]).toEqual({ row: 0, col: 0 });
	});
});
