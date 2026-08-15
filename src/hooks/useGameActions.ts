import type { User } from "firebase/auth";
import { Timestamp } from "firebase/firestore";
import { useCallback, useRef } from "react";
import {
	markPuzzleAsPlayed,
	saveGameState,
	saveHighScore,
} from "@/logic/firebase";
import { applyActions } from "@/logic/gameReducer";
import { SudokuSolver } from "@/logic/solver";
import { createEmptyNotes, isBoardComplete } from "@/logic/sudoku";
import type { GameAction, GameState } from "@/types";

interface UseGameActionsProps {
	user: User | null;
	gameState: Omit<GameState, "lastUpdated" | "timer">;
	timer: number;
	setTimer: (t: number | ((prev: number) => number)) => void;
	setWinState: (val: { actions: GameAction[]; timer: number } | null) => void;
	selectedCell: [number, number] | null;
	isNoteMode: boolean;
}

export function useGameActions({
	user,
	gameState,
	timer,
	setTimer,
	setWinState,
	selectedCell,
	isNoteMode,
}: UseGameActionsProps) {
	const { puzzle } = gameState;
	const hasWonLocallyRef = useRef(false);

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

			if (!user) return;

			// Directly write to Firebase on every action
			const isWon = isBoardComplete(newState.current, puzzle.solution);

			if (isWon) {
				hasWonLocallyRef.current = true;
				setWinState({ actions: newActions, timer: currentTimer });
			}

			const savePromise = saveGameState(user.uid, {
				puzzle,
				current: newState.current,
				notes: newState.notes,
				timer: currentTimer,
				actions: newActions,
			});

			if (isWon) {
				await Promise.all([
					saveHighScore({
						puzzle,
						time: currentTimer,
						date: Timestamp.now(),
						userId: user.uid,
						userName: user.displayName || "Anonymous",
						actions: newActions,
					}),
					markPuzzleAsPlayed(user.uid, puzzle.id),
					savePromise,
				]);
			} else {
				// Background save to firebase for optimistic updates
				savePromise.catch((err) => {
					console.error("Failed to save game state to Firebase", err);
				});
			}
		},
		[puzzle, user, timer, setWinState],
	);

	const saveCurrentState = useCallback(
		(currentTimer: number) => {
			if (
				!user ||
				hasWonLocallyRef.current ||
				isBoardComplete(currentDerivedState.current, puzzle.solution)
			)
				return;
			saveGameState(user.uid, {
				puzzle,
				current: currentDerivedState.current,
				notes: currentDerivedState.notes,
				timer: currentTimer,
				actions: gameState.actions,
			}).catch((err) => {
				console.error("Failed to save background game state to Firebase", err);
			});
		},
		[user, puzzle, currentDerivedState, gameState.actions],
	);

	const commitInput = useCallback(
		(num: number | null, forceNote = false) => {
			if (!selectedCell) return;
			const [r, c] = selectedCell;
			const initialRow = puzzle.initial[r];
			if (!initialRow || initialRow[c] !== null) return;
			const currentRow = currentDerivedState.current[r];
			const asNote = forceNote || isNoteMode;

			// Notes on a filled player cell are invisible and cannot be useful.
			if (asNote && num !== null && currentRow?.[c] != null) return;

			let action: GameAction;
			if (asNote && num !== null) {
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
			gameState,
			timer,
			puzzle,
			commitActions,
			currentDerivedState.current,
			currentDerivedState.notes,
			isNoteMode,
			selectedCell,
		],
	);

	const handleInput = useCallback(
		(num: number | null) => commitInput(num),
		[commitInput],
	);

	const handleQuickNote = useCallback(
		(num: number) => commitInput(num, true),
		[commitInput],
	);

	const undo = useCallback(() => {
		if (canUndo) {
			const newActions: GameAction[] = [
				...gameState.actions,
				{ type: "undo", delta: timer },
			];
			commitActions(newActions);
		}
	}, [canUndo, gameState.actions, timer, commitActions]);

	const redo = useCallback(() => {
		if (canRedo) {
			const newActions: GameAction[] = [
				...gameState.actions,
				{ type: "redo", delta: timer },
			];
			commitActions(newActions);
		}
	}, [canRedo, gameState.actions, timer, commitActions]);

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

	const handleReset = useCallback(() => {
		if (!user) return;

		hasWonLocallyRef.current = false;
		setWinState(null);

		const newState = {
			...gameState,
			current: puzzle.initial.map((r) => [...r]),
			notes: createEmptyNotes(),
			actions: [],
		};

		saveGameState(user.uid, {
			...newState,
			timer: 0,
		}).catch((err) =>
			console.error("Failed to reset game state on Firebase", err),
		);
	}, [gameState, puzzle.initial, user, setWinState]);

	return {
		currentDerivedState,
		canUndo,
		canRedo,
		handleInput,
		handleQuickNote,
		undo,
		redo,
		handleSolve,
		handleReset,
		saveCurrentState,
	};
}
