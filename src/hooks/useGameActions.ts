import type { User } from "firebase/auth";
import { Timestamp } from "firebase/firestore";
import { useCallback } from "react";
import {
	markPuzzleAsPlayed,
	saveGameState,
	saveHighScore,
} from "../logic/firebase";
import { applyActions } from "../logic/gameReducer";
import { SudokuSolver } from "../logic/solver";
import { createEmptyNotes, isBoardComplete } from "../logic/sudoku";
import type { GameAction, GameState } from "../types";

interface UseGameActionsProps {
	user: User | null;
	gameState: Omit<GameState, "lastUpdated" | "timer">;
	setGameState: (state: Omit<GameState, "lastUpdated" | "timer">) => void;
	timer: number;
	setTimer: (t: number | ((prev: number) => number)) => void;
	setShowWin: (val: boolean) => void;
	selectedCell: [number, number] | null;
	isNoteMode: boolean;
}

export function useGameActions({
	user,
	gameState,
	setGameState,
	timer,
	setTimer,
	setShowWin,
	selectedCell,
	isNoteMode,
}: UseGameActionsProps) {
	const { puzzle } = gameState;

	// Compute current state and undo/redo info from actions
	const {
		state: currentDerivedState,
		pointer,
		historyLength,
	} = applyActions(puzzle.initial, puzzle.solution, gameState.actions);

	const canUndo = pointer > 0;
	const canRedo = pointer < historyLength - 1;

	const commitActions = useCallback(
		async (newActions: GameAction[], overrideTimer?: number) => {
			const { state: newState } = applyActions(
				puzzle.initial,
				puzzle.solution,
				newActions,
			);

			const currentTimer = overrideTimer ?? timer;

			setGameState({
				...gameState,
				current: newState.current,
				notes: newState.notes,
				actions: newActions,
			});

			if (isBoardComplete(newState.current, puzzle.solution)) {
				setShowWin(true);
				if (user) {
					await Promise.all([
						saveHighScore({
							puzzle,
							time: currentTimer,
							date: Timestamp.now(),
							userId: user.uid,
							userName: user.displayName || "Anonymous",
							actions: newActions,
						}),
						saveGameState(user.uid, {
							puzzle,
							current: newState.current,
							notes: newState.notes,
							timer: currentTimer,
							actions: newActions,
						}),
						markPuzzleAsPlayed(user.uid, puzzle.id),
					]);
				}
			}
		},
		[puzzle, setGameState, gameState, user, timer, setShowWin],
	);

	const handleInput = useCallback(
		(num: number | null) => {
			if (!selectedCell) return;
			const [r, c] = selectedCell;
			const initialRow = puzzle.initial[r];
			if (!initialRow || initialRow[c] !== null) return;

			let action: GameAction;
			if (isNoteMode && num !== null) {
				const rowNotes = currentDerivedState.notes[r];
				const targetCellNotes = rowNotes ? rowNotes[c] : undefined;
				if (targetCellNotes?.has(num)) {
					action = {
						type: "removeNote",
						delta: timer,
						payload: { row: r, col: c, value: num },
					};
				} else {
					action = {
						type: "addNote",
						delta: timer,
						payload: { row: r, col: c, value: num },
					};
				}
			} else {
				if (num === null) {
					action = {
						type: "removeValue",
						delta: timer,
						payload: { row: r, col: c },
					};
				} else {
					// If the value hasn't changed, don't update
					const currentRow = currentDerivedState.current[r];
					if (currentRow && currentRow[c] === num) return;
					action = {
						type: "addValue",
						delta: timer,
						payload: { row: r, col: c, value: num },
					};
				}
			}

			commitActions([...gameState.actions, action]);
		},
		[
			selectedCell,
			puzzle,
			isNoteMode,
			currentDerivedState.notes,
			currentDerivedState.current,
			timer,
			gameState.actions,
			commitActions,
		],
	);

	const appendAction = useCallback(
		(type: "undo" | "redo") => {
			const newActions: GameAction[] = [
				...gameState.actions,
				{ type, delta: timer },
			];
			const { state: newState } = applyActions(
				puzzle.initial,
				puzzle.solution,
				newActions,
			);
			setGameState({
				...gameState,
				current: newState.current,
				notes: newState.notes,
				actions: newActions,
			});
		},
		[gameState, timer, puzzle, setGameState],
	);

	const undo = useCallback(() => {
		if (canUndo) appendAction("undo");
	}, [canUndo, appendAction]);

	const redo = useCallback(() => {
		if (canRedo) appendAction("redo");
	}, [canRedo, appendAction]);

	const handleSolve = useCallback(() => {
		const solver = new SudokuSolver(currentDerivedState.current);
		const result = solver.solve();
		if (!result.isSolvable) return; // Should not happen for valid generated puzzles

		// Offset the solver's delta by adding a fixed duration (0.5s) per action
		const solveActions: GameAction[] = result.actions.map((a, index) => ({
			...a,
			delta: timer + (index + 1),
		}));

		const endTime = timer + solveActions.length;
		setTimer(endTime);
		commitActions([...gameState.actions, ...solveActions], endTime);
	}, [
		currentDerivedState.current,
		timer,
		gameState.actions,
		commitActions,
		setTimer,
	]);

	const handleHint = useCallback(() => {
		const candidates: { r: number; c: number; v: number }[] = [];
		for (let r = 0; r < 9; r++) {
			const currentRow = currentDerivedState.current[r];
			const solutionRow = puzzle.solution[r];
			const initialRow = puzzle.initial[r];
			if (!currentRow || !solutionRow || !initialRow) continue;
			for (let c = 0; c < 9; c++) {
				if (initialRow[c] !== null) continue;
				const targetValue = solutionRow[c];
				if (
					currentRow[c] !== targetValue &&
					targetValue !== null &&
					targetValue !== undefined
				) {
					candidates.push({ r, c, v: targetValue });
				}
			}
		}
		if (candidates.length > 0) {
			const item = candidates[Math.floor(Math.random() * candidates.length)];
			if (item) {
				const action: GameAction = {
					type: "addValue",
					delta: timer,
					payload: { row: item.r, col: item.c, value: item.v },
				};
				commitActions([...gameState.actions, action]);
			}
		}
	}, [
		currentDerivedState.current,
		puzzle,
		timer,
		gameState.actions,
		commitActions,
	]);

	const handleReset = useCallback(() => {
		setGameState({
			...gameState,
			current: puzzle.initial.map((r) => [...r]),
			notes: createEmptyNotes(),
			actions: [],
		});
		setTimer(0);
	}, [gameState, puzzle.initial, setGameState, setTimer]);

	return {
		currentDerivedState,
		canUndo,
		canRedo,
		handleInput,
		undo,
		redo,
		handleSolve,
		handleHint,
		handleReset,
	};
}
