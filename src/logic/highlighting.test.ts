import { describe, expect, test } from "bun:test";
import type { Board, CellNotes } from "@/types";
import { getCellHighlightState, isMatchingNoteCandidate } from "./highlighting";

const emptyBoard = (): Board =>
	Array.from({ length: 9 }, () => Array<number | null>(9).fill(null));

const emptyNotes = (): CellNotes =>
	Array.from({ length: 9 }, () =>
		Array.from({ length: 9 }, () => new Set<number>()),
	);

describe("getCellHighlightState", () => {
	test("separates the selection, matching values, peers, and unrelated cells", () => {
		const board = emptyBoard();
		if (!board[0] || !board[4]) throw new Error("Board rows are missing");
		board[0][0] = 5;
		board[0][4] = 5;
		board[4][4] = 5;

		expect(getCellHighlightState(board, [0, 0], 0, 0)).toBe("selected");
		expect(getCellHighlightState(board, [0, 0], 0, 4)).toBe("matching");
		expect(getCellHighlightState(board, [0, 0], 4, 4)).toBe("matching");
		expect(getCellHighlightState(board, [0, 0], 0, 7)).toBe("peer");
		expect(getCellHighlightState(board, [0, 0], 7, 0)).toBe("peer");
		expect(getCellHighlightState(board, [0, 0], 2, 2)).toBe("peer");
		expect(getCellHighlightState(board, [0, 0], 4, 7)).toBe("none");
	});

	test("does not treat empty cells as matching values", () => {
		const board = emptyBoard();

		expect(getCellHighlightState(board, [0, 0], 0, 0)).toBe("selected");
		expect(getCellHighlightState(board, [0, 0], 0, 4)).toBe("peer");
		expect(getCellHighlightState(board, [0, 0], 4, 4)).toBe("none");
	});

	test("returns none when there is no selection", () => {
		expect(getCellHighlightState(emptyBoard(), null, 0, 0)).toBe("none");
	});
});

describe("isMatchingNoteCandidate", () => {
	test("matches only the candidate equal to a selected placed value", () => {
		const board = emptyBoard();
		const notes = emptyNotes();
		if (!board[0] || !notes[4]?.[4]) throw new Error("Board is missing");
		board[0][0] = 5;
		notes[4][4].add(5);
		notes[4][4].add(7);

		expect(isMatchingNoteCandidate(board, notes, [0, 0], 4, 4, 5)).toBe(true);
		expect(isMatchingNoteCandidate(board, notes, [0, 0], 4, 4, 7)).toBe(false);
	});

	test("does not match without a selected placed value or inside filled cells", () => {
		const board = emptyBoard();
		const notes = emptyNotes();
		if (!board[0] || !board[4] || !notes[4]?.[4])
			throw new Error("Board is missing");
		notes[4][4].add(5);

		expect(isMatchingNoteCandidate(board, notes, null, 4, 4, 5)).toBe(false);
		expect(isMatchingNoteCandidate(board, notes, [0, 0], 4, 4, 5)).toBe(false);

		board[0][0] = 5;
		board[4][4] = 5;
		expect(isMatchingNoteCandidate(board, notes, [0, 0], 4, 4, 5)).toBe(false);
	});
});
