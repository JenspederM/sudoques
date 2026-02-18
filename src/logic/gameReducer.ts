import type { Board, CellNotes, GameAction } from "../types";
import { createEmptyNotes } from "./sudoku";

export type ReducerGameState = {
	initial: Board;
	current: Board;
	notes: CellNotes;
	solution: Board;
};

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

			// Auto-remove notes if a number is completed (9 instances)
			const counts = new Map<number, number>();
			newBoard.forEach((r) => {
				r.forEach((val) => {
					if (val !== null) {
						counts.set(val, (counts.get(val) || 0) + 1);
					}
				});
			});

			const newNotes = state.notes.map((r) => r.map((cell) => new Set(cell)));
			if ((counts.get(value) || 0) >= 9) {
				for (let i = 0; i < 9; i++) {
					const rowNotes = newNotes[i];
					if (rowNotes) {
						for (let j = 0; j < 9; j++) {
							const cellNotes = rowNotes[j];
							if (cellNotes) {
								cellNotes.delete(value);
							}
						}
					}
				}
			}

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

export type ApplyActionsResult = {
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
