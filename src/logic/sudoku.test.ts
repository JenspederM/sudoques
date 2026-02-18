import { describe, expect, test } from "bun:test";
import type { Board } from "../types";
import {
	checkBoard,
	countValues,
	createEmptyNotes,
	isBoardComplete,
	isValid,
	parsePuzzle,
	solveSudoku,
} from "./sudoku";

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

describe("createEmptyNotes", () => {
	test("should create a 9x9 grid of empty Sets", () => {
		const notes = createEmptyNotes();
		expect(notes.length).toBe(9);
		for (const row of notes) {
			expect(row.length).toBe(9);
			for (const cell of row) {
				expect(cell).toBeInstanceOf(Set);
				expect(cell.size).toBe(0);
			}
		}
	});

	test("each Set should be independent", () => {
		const notes = createEmptyNotes();
		notes[0]?.[0]?.add(5);
		expect(notes[0]?.[0]?.has(5)).toBe(true);
		expect(notes[0]?.[1]?.has(5)).toBe(false);
	});
});

describe("isBoardComplete", () => {
	test("should return true for matching boards", () => {
		const board: Board = Array(9)
			.fill(null)
			.map((_, i) =>
				Array(9)
					.fill(null)
					.map((_, j) => ((i * 9 + j) % 9) + 1),
			);
		expect(isBoardComplete(board, board)).toBe(true);
	});

	test("should return false when cells differ", () => {
		const solution: Board = Array(9)
			.fill(null)
			.map(() => Array(9).fill(1));
		const current: Board = solution.map((r) => [...r]);
		if (current[0]) current[0][0] = 2;
		expect(isBoardComplete(current, solution)).toBe(false);
	});

	test("should return false when cells are null", () => {
		const solution: Board = Array(9)
			.fill(null)
			.map(() => Array(9).fill(1));
		const current: Board = solution.map((r) => [...r]);
		if (current[0]) current[0][0] = null;
		expect(isBoardComplete(current, solution)).toBe(false);
	});
});

describe("countValues", () => {
	test("should count number occurrences", () => {
		const board: Board = Array(9)
			.fill(null)
			.map(() => Array(9).fill(null));
		if (board[0]) {
			board[0][0] = 5;
			board[0][1] = 5;
			board[0][2] = 3;
		}
		const counts = countValues(board);
		expect(counts.get(5)).toBe(2);
		expect(counts.get(3)).toBe(1);
		expect(counts.has(1)).toBe(false);
	});

	test("should skip null cells", () => {
		const board: Board = Array(9)
			.fill(null)
			.map(() => Array(9).fill(null));
		const counts = countValues(board);
		expect(counts.size).toBe(0);
	});
});
