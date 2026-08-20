import type { User } from "firebase/auth";
import { Timestamp } from "firebase/firestore";
import { useCallback, useRef } from "react";
import { useHaptics } from "@/contexts/HapticsContext";
import type { PendingNumberInput } from "@/lib/doubleTapInput";
import {
	markPuzzleAsPlayed,
	saveGameState,
	saveHighScore,
} from "@/logic/firebase";
import { getGameInputChange } from "@/logic/gameInput";
import { applyActions } from "@/logic/gameReducer";
import {
	clearGuestGameState,
	saveGuestGameState,
} from "@/logic/guestGameStorage";
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
	const { trigger } = useHaptics();

	// Compute current state and undo/redo info from actions
	const {
		state: currentDerivedState,
		pointer,
		historyLength,
	} = applyActions(puzzle.initial, puzzle.solution, gameState.actions);

	const canUndo = pointer > 0;
	const canRedo = pointer < historyLength - 1;

	const commitActions = useCallback(
		async (
			newActions: GameAction[],
			overrideTimer?: number,
			precomputedState?: Pick<GameState, "current" | "notes">,
		) => {
			const newState =
				precomputedState ??
				applyActions(puzzle.initial, puzzle.solution, newActions).state;

			const currentTimer = overrideTimer ?? timer;
			const isWon = isBoardComplete(newState.current, puzzle.solution);
			const nextGameState = {
				puzzle,
				current: newState.current,
				notes: newState.notes,
				timer: currentTimer,
				actions: newActions,
			};

			// Keep a synchronous, UID-independent safety copy for guest sessions.
			if (user?.isAnonymous) {
				if (isWon) clearGuestGameState();
				else saveGuestGameState(user.uid, nextGameState);
			}

			if (!user) return;

			if (isWon) {
				hasWonLocallyRef.current = true;
				setWinState({ actions: newActions, timer: currentTimer });
			}

			// Directly write to Firebase on every action.
			const savePromise = saveGameState(user.uid, nextGameState);

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
				hasWonLocallyRef.current ||
				isBoardComplete(currentDerivedState.current, puzzle.solution)
			)
				return;

			const stateToSave = {
				puzzle,
				current: currentDerivedState.current,
				notes: currentDerivedState.notes,
				timer: currentTimer,
				actions: gameState.actions,
			};

			if (user?.isAnonymous) {
				saveGuestGameState(user.uid, stateToSave);
			}

			if (!user) return;

			saveGameState(user.uid, stateToSave).catch((err) => {
				console.error("Failed to save background game state to Firebase", err);
			});
		},
		[user, puzzle, currentDerivedState, gameState.actions],
	);

	const buildInputTransition = useCallback(
		(
			num: number | null,
			{
				forceNote = false,
				forceValue = false,
				targetCell,
			}: {
				forceNote?: boolean;
				forceValue?: boolean;
				targetCell?: [number, number];
			} = {},
		) => {
			const change = getGameInputChange({
				selectedCell: targetCell ?? selectedCell,
				initial: puzzle.initial,
				solution: puzzle.solution,
				current: currentDerivedState.current,
				notes: currentDerivedState.notes,
				isNoteMode: forceValue ? false : isNoteMode,
				forceNote,
				value: num,
				timer,
			});
			if (!change) return null;

			const newActions = [...gameState.actions, change.action];
			const { state: nextState } = applyActions(
				puzzle.initial,
				puzzle.solution,
				newActions,
			);
			return { change, newActions, nextState };
		},
		[
			gameState.actions,
			currentDerivedState.current,
			currentDerivedState.notes,
			isNoteMode,
			puzzle.initial,
			puzzle.solution,
			selectedCell,
			timer,
		],
	);

	const commitInput = useCallback(
		(
			num: number | null,
			{
				forceNote = false,
				forceValue = false,
				withHaptic = true,
				targetCell,
			}: {
				forceNote?: boolean;
				forceValue?: boolean;
				withHaptic?: boolean;
				targetCell?: [number, number];
			} = {},
		) => {
			const transition = buildInputTransition(num, {
				forceNote,
				forceValue,
				targetCell,
			});
			if (!transition) return false;
			const { change, newActions, nextState } = transition;

			if (withHaptic) {
				if (isBoardComplete(nextState.current, puzzle.solution)) {
					trigger("success");
				} else if (change.kind === "value") {
					trigger(change.isCorrect ? "value" : "incorrect");
				} else {
					trigger(change.kind);
				}
			}
			void commitActions(newActions, undefined, nextState);
			return true;
		},
		[buildInputTransition, commitActions, puzzle.solution, trigger],
	);

	const getValuePreview = useCallback(
		(num: number) => {
			const transition = buildInputTransition(num, { forceValue: true });
			if (!transition || transition.change.kind !== "value" || !selectedCell)
				return null;
			const [row, col] = selectedCell;
			return {
				row,
				col,
				value: num,
				isCorrect: transition.change.isCorrect === true,
				isComplete: isBoardComplete(
					transition.nextState.current,
					puzzle.solution,
				),
				canQuickNote: currentDerivedState.current[row]?.[col] == null,
				hasMatchingNote: transition.change.hasMatchingNote === true,
			};
		},
		[
			buildInputTransition,
			currentDerivedState.current,
			puzzle.solution,
			selectedCell,
		],
	);

	const handleInput = useCallback(
		(num: number | null) => commitInput(num),
		[commitInput],
	);

	const handleQuickNote = useCallback(
		(num: number) => commitInput(num, { forceNote: true }),
		[commitInput],
	);

	const handleDeferredInput = useCallback(
		(input: PendingNumberInput) =>
			commitInput(input.value, {
				forceValue: true,
				withHaptic: false,
				targetCell: [input.row, input.col],
			}),
		[commitInput],
	);

	const handleQuickNoteAt = useCallback(
		(input: PendingNumberInput) =>
			commitInput(input.value, {
				forceNote: true,
				targetCell: [input.row, input.col],
			}),
		[commitInput],
	);

	const undo = useCallback(() => {
		if (canUndo) {
			const newActions: GameAction[] = [
				...gameState.actions,
				{ type: "undo", delta: timer },
			];
			trigger("undo");
			void commitActions(newActions);
		}
	}, [canUndo, gameState.actions, timer, commitActions, trigger]);

	const redo = useCallback(() => {
		if (canRedo) {
			const newActions: GameAction[] = [
				...gameState.actions,
				{ type: "redo", delta: timer },
			];
			trigger("redo");
			void commitActions(newActions);
		}
	}, [canRedo, gameState.actions, timer, commitActions, trigger]);

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
		trigger("success");
		void commitActions([...gameState.actions, ...solveActions], endTime);
	}, [
		currentDerivedState.current,
		timer,
		gameState.actions,
		commitActions,
		setTimer,
		trigger,
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
		const stateToSave = { ...newState, timer: 0 };

		if (user.isAnonymous) {
			saveGuestGameState(user.uid, stateToSave);
		}

		trigger("reset");
		saveGameState(user.uid, stateToSave).catch((err) =>
			console.error("Failed to reset game state on Firebase", err),
		);
	}, [gameState, puzzle.initial, user, setWinState, trigger]);

	return {
		currentDerivedState,
		canUndo,
		canRedo,
		handleInput,
		handleQuickNote,
		handleQuickNoteAt,
		handleDeferredInput,
		getValuePreview,
		undo,
		redo,
		handleSolve,
		handleReset,
		saveCurrentState,
	};
}
