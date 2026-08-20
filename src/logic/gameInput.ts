import type { Board, CellNotes, GameAction } from "@/types";

export type GameInputChange = {
	action: GameAction;
	kind: "value" | "note" | "erase";
	isCorrect?: boolean;
	hasMatchingNote?: boolean;
};

interface GetGameInputChangeOptions {
	selectedCell: [number, number] | null;
	initial: Board;
	solution: Board;
	current: Board;
	notes: CellNotes;
	isNoteMode: boolean;
	forceNote?: boolean;
	value: number | null;
	timer: number;
}

export function getGameInputChange({
	selectedCell,
	initial,
	solution,
	current,
	notes,
	isNoteMode,
	forceNote = false,
	value,
	timer,
}: GetGameInputChangeOptions): GameInputChange | null {
	if (!selectedCell) return null;
	const [row, col] = selectedCell;
	if (initial[row]?.[col] !== null) return null;

	const currentValue = current[row]?.[col];
	const asNote = forceNote || isNoteMode;

	if (asNote && value !== null) {
		// Notes on a filled player cell are invisible and cannot be useful.
		if (currentValue != null) return null;
		const hasNote = notes[row]?.[col]?.has(value) ?? false;
		return {
			kind: "note",
			action: {
				type: hasNote ? "removeNote" : "addNote",
				delta: timer,
				payload: { row, col, value },
			},
		};
	}

	if (value === null) {
		const hasNotes = (notes[row]?.[col]?.size ?? 0) > 0;
		if (currentValue == null && !hasNotes) return null;
		return {
			kind: "erase",
			action: {
				type: "removeValue",
				delta: timer,
				payload: { row, col },
			},
		};
	}

	if (currentValue === value) return null;
	return {
		kind: "value",
		isCorrect: solution[row]?.[col] === value,
		hasMatchingNote: notes[row]?.[col]?.has(value) ?? false,
		action: {
			type: "addValue",
			delta: timer,
			payload: { row, col, value },
		},
	};
}
