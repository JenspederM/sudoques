import type { Board, GameAction, GameState } from "../types";

export type ReducerGameState = Omit<
	GameState,
	"lastUpdated" | "timer" | "actions"
>;

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

/**
 * Reconstructs the game state from a list of actions applied to an initial board.
 */
export function applyActions(
	initialBoard: Board,
	solution: Board,
	actions: GameAction[],
): ReducerGameState {
	const state: ReducerGameState = {
		initial: initialBoard,
		current: initialBoard.map((row) => [...row]),
		notes: Array(9)
			.fill(null)
			.map(() =>
				Array(9)
					.fill(null)
					.map(() => new Set<number>()),
			),
		solution: solution,
	};

	// We only apply non-undo/redo actions here?
	// Actually, playback usually means just replaying the move log.
	// If the move log contains undo/redo, it gets complicated.
	// Better to store only "canonical" moves in the playback log or handle undo/redo by popping/pushing.

	// For now, let's assume actions in GameState.actions are the "undoable" history.
	// If we want to support undo/redo in the log, we need to handle them.

	const history: ReducerGameState[] = [state];
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
		// Fallback to initial state if something went wrong
		return {
			initial: initialBoard,
			current: initialBoard.map((row) => [...row]),
			notes: Array(9)
				.fill(null)
				.map(() =>
					Array(9)
						.fill(null)
						.map(() => new Set<number>()),
				),
			solution: solution,
		};
	}

	return finalState;
}
