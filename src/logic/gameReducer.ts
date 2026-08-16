import { createEmptyNotes } from "@/logic/sudoku";
import type { Board, CellNotes, GameAction } from "@/types";

type ReducerGameState = {
	initial: Board;
	current: Board;
	notes: CellNotes;
	solution: Board;
};

/** @public */
export function gameReducer(
	state: ReducerGameState,
	action: GameAction,
): ReducerGameState {
	switch (action.type) {
		case "addValue": {
			const { row, col, value } = action.payload;
			const newBoard = state.current.map((r, ri) =>
				ri === row ? r.map((c, ci) => (ci === col ? value : c)) : [...r],
			);

			// A placed value rules out the same candidate in its row, column,
			// and 3x3 box. Notes in the filled cell itself are no longer relevant.
			const newNotes = state.notes.map((noteRow, ri) =>
				noteRow.map((cellNotes, ci) => {
					if (ri === row && ci === col) return new Set<number>();

					const nextNotes = new Set(cellNotes);
					const sharesBox =
						Math.floor(ri / 3) === Math.floor(row / 3) &&
						Math.floor(ci / 3) === Math.floor(col / 3);

					if (ri === row || ci === col || sharesBox) {
						nextNotes.delete(value);
					}
					return nextNotes;
				}),
			);

			return {
				...state,
				current: newBoard,
				notes: newNotes,
			};
		}
		case "removeValue": {
			const { row, col } = action.payload;
			const newBoard = state.current.map((r, ri) =>
				ri === row ? r.map((c, ci) => (ci === col ? null : c)) : [...r],
			);
			// Clear notes for this cell when removing value
			const newNotes = state.notes.map((r, ri) =>
				ri === row
					? r.map((cell, ci) =>
							ci === col ? new Set<number>() : new Set(cell),
						)
					: r.map((cell) => new Set(cell)),
			);
			return {
				...state,
				current: newBoard,
				notes: newNotes,
			};
		}
		case "addNote": {
			const { row, col, value } = action.payload;
			const newNotes = state.notes.map((r, ri) =>
				ri === row
					? r.map((cell, ci) => {
							if (ci === col) {
								const next = new Set(cell);
								next.add(value);
								return next;
							}
							return new Set(cell);
						})
					: r.map((cell) => new Set(cell)),
			);
			return {
				...state,
				notes: newNotes,
			};
		}
		case "removeNote": {
			const { row, col, value } = action.payload;
			const newNotes = state.notes.map((r, ri) =>
				ri === row
					? r.map((cell, ci) => {
							if (ci === col) {
								const next = new Set(cell);
								next.delete(value);
								return next;
							}
							return new Set(cell);
						})
					: r.map((cell) => new Set(cell)),
			);
			return {
				...state,
				notes: newNotes,
			};
		}
		default:
			return state;
	}
}

type ApplyActionsResult = {
	state: ReducerGameState;
	pointer: number;
	historyLength: number;
};

/**
 * Reconstructs the game state from a list of actions applied to an initial board.
 * Returns the final state along with undo/redo pointer info.
 */
export function applyActions(
	initialBoard: Board,
	solution: Board,
	actions: GameAction[],
): ApplyActionsResult {
	const initialState: ReducerGameState = {
		initial: initialBoard,
		current: initialBoard.map((row) => [...row]),
		notes: createEmptyNotes(),
		solution: solution,
	};

	const history: ReducerGameState[] = [initialState];
	let pointer = 0;

	for (const action of actions) {
		if (action.type === "undo") {
			if (pointer > 0) pointer--;
		} else if (action.type === "redo") {
			if (pointer < history.length - 1) pointer++;
		} else {
			const currentState = history[pointer];
			if (!currentState) break;
			const nextState = gameReducer(currentState, action);
			history.splice(pointer + 1);
			history.push(nextState);
			pointer++;
		}
	}

	const finalState = history[pointer];
	if (!finalState) {
		return {
			state: {
				initial: initialBoard,
				current: initialBoard.map((row) => [...row]),
				notes: createEmptyNotes(),
				solution: solution,
			},
			pointer: 0,
			historyLength: 1,
		};
	}

	return {
		state: finalState,
		pointer,
		historyLength: history.length,
	};
}
