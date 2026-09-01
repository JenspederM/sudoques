import { describe, expect, test } from "bun:test";
import { getGameInputChange } from "./gameInput";
import { createEmptyNotes } from "./sudoku";

const emptyBoard = () =>
	Array.from({ length: 9 }, () => Array<number | null>(9).fill(null));

function firstRow<T>(grid: T[][]) {
	const row = grid[0];
	if (!row) throw new Error("Expected a non-empty test grid");
	return row;
}

const createOptions = () => {
	const initial = emptyBoard();
	const solution = emptyBoard();
	const current = emptyBoard();
	firstRow(solution)[0] = 4;
	return {
		selectedCell: [0, 0] as [number, number],
		initial,
		solution,
		current,
		notes: createEmptyNotes(),
		isNoteMode: false,
		value: 4,
		timer: 10,
	};
};

describe("getGameInputChange", () => {
	test("returns a correct value change for an editable cell", () => {
		const change = getGameInputChange(createOptions());
		expect(change?.kind).toBe("value");
		expect(change?.isCorrect).toBe(true);
		expect(change?.action.type).toBe("addValue");
	});

	test("marks an incorrect value without rejecting the move", () => {
		const change = getGameInputChange({ ...createOptions(), value: 7 });
		expect(change?.kind).toBe("value");
		expect(change?.isCorrect).toBe(false);
	});

	test("reports whether a value preview replaces the same existing note", () => {
		const options = createOptions();
		const noteCell = firstRow(options.notes)[0];
		if (!noteCell) throw new Error("Expected a note cell");
		noteCell.add(4);

		expect(getGameInputChange(options)?.hasMatchingNote).toBe(true);
		expect(getGameInputChange({ ...options, value: 7 })?.hasMatchingNote).toBe(
			false,
		);
	});

	test("toggles a note only while the target cell is empty", () => {
		const options = { ...createOptions(), forceNote: true };
		expect(getGameInputChange(options)?.action.type).toBe("addNote");

		const noteCell = firstRow(options.notes)[0];
		if (!noteCell) throw new Error("Expected a note cell");
		noteCell.add(4);
		expect(getGameInputChange(options)?.action.type).toBe("removeNote");

		firstRow(options.current)[0] = 3;
		expect(getGameInputChange(options)).toBeNull();
	});

	test("rejects selections and inputs that do not change the board", () => {
		const options = createOptions();
		expect(getGameInputChange({ ...options, selectedCell: null })).toBeNull();

		firstRow(options.initial)[0] = 4;
		expect(getGameInputChange(options)).toBeNull();
		firstRow(options.initial)[0] = null;

		firstRow(options.current)[0] = 4;
		expect(getGameInputChange(options)).toBeNull();
		firstRow(options.current)[0] = null;
		expect(getGameInputChange({ ...options, value: null })).toBeNull();
	});

	test("erase clears a note-only cell but stays a no-op for an empty cell", () => {
		const options = createOptions();
		expect(getGameInputChange({ ...options, value: null })).toBeNull();

		const noteCell = firstRow(options.notes)[0];
		if (!noteCell) throw new Error("Expected a note cell");
		noteCell.add(4);

		const change = getGameInputChange({ ...options, value: null });
		expect(change?.kind).toBe("erase");
		expect(change?.action).toEqual({
			type: "removeValue",
			delta: 10,
			payload: { row: 0, col: 0 },
		});
	});
});
