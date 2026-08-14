import { describe, expect, test } from "bun:test";
import type { Board, GameAction } from "../types";
import { applyActions, gameReducer } from "./gameReducer";

const emptyBoard: Board = Array(9)
	.fill(null)
	.map(() => Array(9).fill(null));
const solution: Board = Array(9)
	.fill(null)
	.map(() => Array(9).fill(1)); // Dummy solution

describe("gameReducer", () => {
	test("addValue should update current board", () => {
		const initialState = {
			initial: emptyBoard,
			current: emptyBoard.map((r) => [...r]),
			notes: Array(9)
				.fill(null)
				.map(() =>
					Array(9)
						.fill(null)
						.map(() => new Set<number>()),
				),
			solution: solution,
		};
		const action: GameAction = {
			type: "addValue",
			delta: 0,
			payload: { row: 0, col: 0, value: 5 },
		};
		const newState = gameReducer(initialState, action);
		expect(newState.current[0]?.[0]).toBe(5);
	});

	test("removeValue should clear cell and cell notes", () => {
		const initialState = {
			initial: emptyBoard,
			current: emptyBoard.map((r) => [...r]),
			notes: Array(9)
				.fill(null)
				.map(() =>
					Array(9)
						.fill(null)
						.map(() => new Set<number>()),
				),
			solution: solution,
		};
		if (initialState.current[0]) {
			initialState.current[0][0] = 5;
		}
		initialState.notes[0]?.[0]?.add(1);

		const action: GameAction = {
			type: "removeValue",
			delta: 0,
			payload: { row: 0, col: 0 },
		};
		const newState = gameReducer(initialState, action);
		expect(newState.current[0]?.[0]).toBeNull();
		expect(newState.notes[0]?.[0]?.size).toBe(0);
	});

	test("addNote and removeNote", () => {
		const initialState = {
			initial: emptyBoard,
			current: emptyBoard.map((r) => [...r]),
			notes: Array(9)
				.fill(null)
				.map(() =>
					Array(9)
						.fill(null)
						.map(() => new Set<number>()),
				),
			solution: solution,
		};

		let state = gameReducer(initialState, {
			type: "addNote",
			delta: 0,
			payload: { row: 0, col: 0, value: 3 },
		});
		expect(state.notes[0]?.[0]?.has(3)).toBe(true);

		state = gameReducer(state, {
			type: "removeNote",
			delta: 0,
			payload: { row: 0, col: 0, value: 3 },
		});
		expect(state.notes[0]?.[0]?.has(3)).toBe(false);
	});
});

describe("applyActions", () => {
	test("should reconstruct final state from actions", () => {
		const actions: GameAction[] = [
			{ type: "addValue", delta: 0, payload: { row: 0, col: 0, value: 5 } },
			{ type: "addValue", delta: 0, payload: { row: 0, col: 1, value: 3 } },
			{ type: "undo", delta: 0 },
			{ type: "addValue", delta: 0, payload: { row: 0, col: 2, value: 9 } },
		];

		const {
			state: finalState,
			pointer,
			historyLength,
		} = applyActions(emptyBoard, solution, actions);
		expect(finalState.current[0]?.[0]).toBe(5);
		expect(finalState.current[0]?.[1]).toBeNull(); // was undone
		expect(finalState.current[0]?.[2]).toBe(9);
		expect(pointer).toBe(2);
		expect(historyLength).toBe(3);
	});

	test("redo should work", () => {
		const actions: GameAction[] = [
			{ type: "addValue", delta: 0, payload: { row: 0, col: 0, value: 5 } },
			{ type: "undo", delta: 0 },
			{ type: "redo", delta: 0 },
		];

		const { state: finalState, pointer } = applyActions(
			emptyBoard,
			solution,
			actions,
		);
		expect(finalState.current[0]?.[0]).toBe(5);
		expect(pointer).toBe(1);
	});

	test("new move after undo should branch (clear redo history)", () => {
		const actions: GameAction[] = [
			{ type: "addValue", delta: 0, payload: { row: 0, col: 0, value: 5 } },
			{ type: "undo", delta: 0 },
			{ type: "addValue", delta: 0, payload: { row: 0, col: 1, value: 3 } },
			{ type: "redo", delta: 0 }, // should do nothing as redo history was cleared
		];

		const { state: finalState } = applyActions(emptyBoard, solution, actions);
		expect(finalState.current[0]?.[0]).toBeNull();
		expect(finalState.current[0]?.[1]).toBe(3);
	});

	test("placing a value removes matching notes from all peer cells", () => {
		const actions: GameAction[] = [
			{ type: "addNote", delta: 0, payload: { row: 4, col: 8, value: 5 } },
			{ type: "addNote", delta: 0, payload: { row: 8, col: 4, value: 5 } },
			{ type: "addNote", delta: 0, payload: { row: 3, col: 3, value: 5 } },
			{ type: "addNote", delta: 0, payload: { row: 0, col: 0, value: 5 } },
			{ type: "addNote", delta: 0, payload: { row: 4, col: 8, value: 6 } },
			{ type: "addNote", delta: 0, payload: { row: 4, col: 4, value: 2 } },
			{ type: "addValue", delta: 0, payload: { row: 4, col: 4, value: 5 } },
		];

		const { state: finalState } = applyActions(emptyBoard, solution, actions);

		expect(finalState.notes[4]?.[8]?.has(5)).toBe(false); // same row
		expect(finalState.notes[8]?.[4]?.has(5)).toBe(false); // same column
		expect(finalState.notes[3]?.[3]?.has(5)).toBe(false); // same box
		expect(finalState.notes[0]?.[0]?.has(5)).toBe(true); // unrelated cell
		expect(finalState.notes[4]?.[8]?.has(6)).toBe(true); // other candidate
		expect(finalState.notes[4]?.[4]?.size).toBe(0); // filled cell
	});

	test("undo restores notes removed by a placement and redo removes them again", () => {
		const baseActions: GameAction[] = [
			{ type: "addNote", delta: 0, payload: { row: 4, col: 8, value: 5 } },
			{ type: "addValue", delta: 0, payload: { row: 4, col: 4, value: 5 } },
		];

		const undone = applyActions(emptyBoard, solution, [
			...baseActions,
			{ type: "undo", delta: 0 },
		]);
		expect(undone.state.notes[4]?.[8]?.has(5)).toBe(true);

		const redone = applyActions(emptyBoard, solution, [
			...baseActions,
			{ type: "undo", delta: 0 },
			{ type: "redo", delta: 0 },
		]);
		expect(redone.state.notes[4]?.[8]?.has(5)).toBe(false);
	});
});
