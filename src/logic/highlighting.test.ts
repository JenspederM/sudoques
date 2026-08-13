import { describe, expect, test } from "bun:test";
import type { Board } from "@/types";
import { getCellHighlightState } from "./highlighting";

const emptyBoard = (): Board =>
	Array.from({ length: 9 }, () => Array<number | null>(9).fill(null));

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
