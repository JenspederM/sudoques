import type { User } from "firebase/auth";
import { AnimatePresence } from "framer-motion";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GameControls } from "@/components/GameControls";
import { GameMenu } from "@/components/GameMenu";
import { HintPanel } from "@/components/HintPanel";
import { Layout } from "@/components/Layout";
import { Numpad } from "@/components/Numpad";
import {
	StaggeredList,
	StaggeredListElement,
} from "@/components/StaggeredList";
import { SudokuGrid } from "@/components/SudokuGrid";
import { Timer } from "@/components/Timer";
import { VictoryDialog } from "@/components/VictoryDialog";
import { useHaptics } from "@/contexts/HapticsContext";
import { useGameActions } from "@/hooks/useGameActions";
import { useGameKeyboard } from "@/hooks/useGameKeyboard";
import { useGameTimer } from "@/hooks/useGameTimer";
import { useScreenWakeLock } from "@/hooks/useScreenWakeLock";
import type {
	CellGestureCommit,
	CellGestureMode,
} from "@/lib/cellGestureNumpad";
import {
	createDoubleTapInputController,
	type PendingNoteToggle,
	type PendingNumberInput,
} from "@/lib/doubleTapInput";
import { buildReviewState } from "@/lib/utils";
import {
	type ExplainableHint,
	findExplainableHint,
} from "@/logic/explainableSolver";
import {
	getInitialHintDisclosureStage,
	getVisibleHintStep,
	type HintDisclosureStage,
	INITIAL_HINT_DISCLOSURE_STAGE,
} from "@/logic/hintPresentation";
import {
	checkBoard,
	countValues,
	getDisabledNumbers,
	getRemainingCounts,
	isBoardComplete,
} from "@/logic/sudoku";
import type { GameAction, GameState } from "@/types";

interface GamePageProps {
	user: User | null;
	gameState: Omit<GameState, "lastUpdated" | "timer">;
	timer: number;
}

type PendingValue = PendingNumberInput & {
	phase: "preview" | "committing";
};

const COMMIT_ECHO_TIMEOUT_MS = 2_000;

export const GamePage: React.FC<GamePageProps> = ({
	user,
	gameState,
	timer: initialTime,
}) => {
	const navigate = useNavigate();
	useScreenWakeLock();
	const { trigger, cancel: cancelHaptic } = useHaptics();
	const [selectedCell, setSelectedCell] = useState<[number, number] | null>(
		null,
	);
	const [pendingValue, setPendingValueState] = useState<PendingValue | null>(
		null,
	);
	const pendingValueRef = useRef<PendingValue | null>(null);
	const [pendingNoteToggle, setPendingNoteToggleState] =
		useState<PendingNoteToggle | null>(null);
	const pendingNoteToggleRef = useRef<PendingNoteToggle | null>(null);
	const inputControllerRef = useRef<ReturnType<
		typeof createDoubleTapInputController
	> | null>(null);
	if (!inputControllerRef.current) {
		inputControllerRef.current = createDoubleTapInputController();
	}
	const inputController = inputControllerRef.current;
	const setPendingValue = useCallback((value: PendingValue | null) => {
		pendingValueRef.current = value;
		setPendingValueState(value);
	}, []);
	const setPendingNoteToggle = useCallback(
		(value: PendingNoteToggle | null) => {
			pendingNoteToggleRef.current = value;
			setPendingNoteToggleState(value);
		},
		[],
	);
	const [isNoteMode, setIsNoteMode] = useState(false);
	const [hint, setHint] = useState<ExplainableHint | null>(null);
	const [hintStepIndex, setHintStepIndex] = useState(0);
	const [hintDisclosureStage, setHintDisclosureStage] =
		useState<HintDisclosureStage>(INITIAL_HINT_DISCLOSURE_STAGE);
	const actionCount = gameState.actions.length;
	const previousActionCount = useRef(actionCount);
	const [winState, setWinState] = useState<{
		actions: GameAction[];
		timer: number;
	} | null>(null);

	const { time: timer, setTime: setTimer } = useGameTimer(
		initialTime,
		!!winState,
	);

	const { puzzle } = gameState;
	const previousPuzzleId = useRef(puzzle.id);

	const {
		currentDerivedState,
		canUndo,
		canRedo,
		handleInput,
		handleQuickNote,
		handleQuickNoteAt,
		handleCellGestureInput,
		handleDeferredInput,
		getValuePreview,
		undo,
		redo,
		handleSolve,
		handleReset,
		saveCurrentState,
	} = useGameActions({
		user,
		gameState,
		timer,
		setTimer,
		setWinState,
		selectedCell,
		isNoteMode,
	});

	const cancelPendingInput = useCallback(
		() => inputController.cancel(),
		[inputController],
	);

	const handleNumpadInput = useCallback(
		(num: number | null) => {
			if (
				pendingValueRef.current?.phase === "committing" ||
				pendingNoteToggleRef.current
			)
				return;

			if (num === null) {
				cancelPendingInput();
				handleInput(null);
				return;
			}

			if (isNoteMode) {
				cancelPendingInput();
				handleInput(num);
				return;
			}

			const preview = getValuePreview(num);
			if (!preview) return;
			if (!preview.canQuickNote) {
				cancelPendingInput();
				handleInput(num);
				return;
			}

			const input: PendingNumberInput = {
				row: preview.row,
				col: preview.col,
				value: preview.value,
			};
			inputController.tap(input, {
				onPreview: (nextInput) => {
					if (!preview.hasMatchingNote) {
						setPendingValue({ ...nextInput, phase: "preview" });
					}
					trigger(
						preview.isComplete
							? "pendingSuccess"
							: preview.isCorrect
								? "value"
								: "pendingIncorrect",
					);
				},
				onCommit: (committedInput, reason) => {
					if (reason === "flush") {
						cancelHaptic();
						if (preview.isComplete) trigger("success");
						else if (!preview.isCorrect) trigger("incorrect");
					}
					setPendingValue({ ...committedInput, phase: "committing" });
					if (!handleDeferredInput(committedInput)) {
						setPendingValue(null);
						cancelHaptic();
					}
				},
				onNote: (noteInput) => {
					setPendingValue(null);
					setPendingNoteToggle({
						...noteInput,
						shouldExist: !preview.hasMatchingNote,
					});
					cancelHaptic();
					if (!handleQuickNoteAt(noteInput)) {
						setPendingNoteToggle(null);
						cancelHaptic();
					}
				},
				onCancel: () => {
					setPendingValue(null);
					cancelHaptic();
				},
			});
		},
		[
			cancelHaptic,
			cancelPendingInput,
			getValuePreview,
			handleDeferredInput,
			handleInput,
			handleQuickNoteAt,
			inputController,
			isNoteMode,
			setPendingValue,
			setPendingNoteToggle,
			trigger,
		],
	);

	useEffect(() => {
		if (pendingValue?.phase !== "committing") return;
		if (
			currentDerivedState.current[pendingValue.row]?.[pendingValue.col] ===
			pendingValue.value
		) {
			setPendingValue(null);
			return;
		}

		// Firestore normally echoes a local write immediately, even while offline.
		// Never leave the controls locked forever if a write is rejected or reverted.
		const timeout = globalThis.setTimeout(() => {
			const latestPending = pendingValueRef.current;
			if (
				latestPending?.phase === "committing" &&
				latestPending.row === pendingValue.row &&
				latestPending.col === pendingValue.col &&
				latestPending.value === pendingValue.value
			) {
				setPendingValue(null);
			}
		}, COMMIT_ECHO_TIMEOUT_MS);

		return () => globalThis.clearTimeout(timeout);
	}, [currentDerivedState.current, pendingValue, setPendingValue]);

	useEffect(() => {
		if (!pendingNoteToggle) return;
		const noteExists =
			currentDerivedState.notes[pendingNoteToggle.row]?.[
				pendingNoteToggle.col
			]?.has(pendingNoteToggle.value) ?? false;
		if (noteExists === pendingNoteToggle.shouldExist) {
			setPendingNoteToggle(null);
			return;
		}

		const timeout = globalThis.setTimeout(() => {
			const latestPending = pendingNoteToggleRef.current;
			if (
				latestPending?.row === pendingNoteToggle.row &&
				latestPending.col === pendingNoteToggle.col &&
				latestPending.value === pendingNoteToggle.value &&
				latestPending.shouldExist === pendingNoteToggle.shouldExist
			) {
				setPendingNoteToggle(null);
			}
		}, COMMIT_ECHO_TIMEOUT_MS);

		return () => globalThis.clearTimeout(timeout);
	}, [currentDerivedState.notes, pendingNoteToggle, setPendingNoteToggle]);

	const handleHint = () => {
		if (
			pendingValueRef.current?.phase === "committing" ||
			pendingNoteToggleRef.current
		)
			return;
		cancelPendingInput();
		trigger("hint");
		setSelectedCell(null);
		setHintStepIndex(0);
		const nextHint = findExplainableHint(
			currentDerivedState.current,
			puzzle.initial,
			puzzle.solution,
			{
				difficulty: puzzle.difficulty,
				techniques: puzzle.techniques,
				notes: currentDerivedState.notes,
				allowBeyondProfileAfterRecordedNotes: true,
			},
		);
		setHintDisclosureStage(getInitialHintDisclosureStage(nextHint));
		setHint(nextHint);
	};

	useEffect(() => {
		if (previousActionCount.current !== actionCount) {
			cancelPendingInput();
			setHint(null);
			setHintStepIndex(0);
			setHintDisclosureStage(INITIAL_HINT_DISCLOSURE_STAGE);
		}
		previousActionCount.current = actionCount;
	}, [actionCount, cancelPendingInput]);

	useEffect(() => {
		if (previousPuzzleId.current !== puzzle.id) {
			cancelPendingInput();
			setPendingValue(null);
			setPendingNoteToggle(null);
			cancelHaptic();
			previousPuzzleId.current = puzzle.id;
		}
	}, [
		cancelHaptic,
		cancelPendingInput,
		puzzle.id,
		setPendingNoteToggle,
		setPendingValue,
	]);

	// Check for win on load
	useEffect(() => {
		if (!winState && isBoardComplete(gameState.current, puzzle.solution)) {
			setWinState({ actions: gameState.actions, timer });
		}
	}, [gameState.current, gameState.actions, puzzle.solution, timer, winState]);

	const saveCurrentStateRef = useRef(saveCurrentState);
	const timerRef = useRef(timer);

	useEffect(() => {
		saveCurrentStateRef.current = saveCurrentState;
		timerRef.current = timer;
	}, [saveCurrentState, timer]);

	useEffect(() => {
		const handleVisibilityChange = () => {
			if (document.visibilityState === "hidden") {
				const committedPendingInput = inputController.flush();
				if (
					!committedPendingInput &&
					!pendingValueRef.current &&
					!pendingNoteToggleRef.current
				) {
					saveCurrentStateRef.current(timerRef.current);
				}
			}
		};

		const handlePageHide = () => {
			const committedPendingInput = inputController.flush();
			if (
				!committedPendingInput &&
				!pendingValueRef.current &&
				!pendingNoteToggleRef.current
			) {
				saveCurrentStateRef.current(timerRef.current);
			}
		};

		window.addEventListener("visibilitychange", handleVisibilityChange);
		window.addEventListener("pagehide", handlePageHide);

		return () => {
			window.removeEventListener("visibilitychange", handleVisibilityChange);
			window.removeEventListener("pagehide", handlePageHide);
			const committedPendingInput = inputController.flush();
			if (
				!committedPendingInput &&
				!pendingValueRef.current &&
				!pendingNoteToggleRef.current
			) {
				saveCurrentStateRef.current(timerRef.current);
			}
			inputController.dispose();
			cancelHaptic();
		};
	}, [cancelHaptic, inputController]);

	const handleCellSelect = (r: number, c: number) => {
		if (pendingNoteToggleRef.current) return;
		inputController.flush();
		if (selectedCell !== null && selectedCell[0] === r && selectedCell[1] === c)
			setSelectedCell(null);
		else setSelectedCell([r, c]);
	};
	const handleCellGestureArm = useCallback(
		(mode: CellGestureMode) => {
			// Preserve a number that is still inside the double-tap preview window.
			// A board touch used to flush that value before changing selection; silently
			// cancelling it here would make fast play lose an otherwise valid move.
			inputController.flush();
			cancelHaptic();
			trigger(mode === "note" ? "gestureNoteOpen" : "gestureValueOpen");
		},
		[cancelHaptic, inputController, trigger],
	);
	const handleCellGestureDisarm = useCallback(() => {
		cancelHaptic();
	}, [cancelHaptic]);
	const handleCellGestureFocus = useCallback((row: number, col: number) => {
		setSelectedCell([row, col]);
	}, []);
	const handleCellGestureCommit = useCallback(
		(input: CellGestureCommit) => {
			if (
				pendingValueRef.current?.phase === "committing" ||
				pendingNoteToggleRef.current
			)
				return;
			cancelPendingInput();
			setSelectedCell([input.row, input.col]);
			if (input.mode === "note") {
				setPendingNoteToggle({
					row: input.row,
					col: input.col,
					value: input.value,
					shouldExist: !(
						currentDerivedState.notes[input.row]?.[input.col]?.has(
							input.value,
						) ?? false
					),
				});
			}
			if (!handleCellGestureInput(input) && input.mode === "note") {
				setPendingNoteToggle(null);
			}
		},
		[
			cancelPendingInput,
			currentDerivedState.notes,
			handleCellGestureInput,
			setPendingNoteToggle,
		],
	);
	const handleToggleNoteMode = useCallback(() => {
		if (pendingNoteToggleRef.current) return;
		cancelPendingInput();
		setIsNoteMode((currentMode) => !currentMode);
		trigger("mode");
	}, [cancelPendingInput, trigger]);

	const setSelectedCellAfterPending: React.Dispatch<
		React.SetStateAction<[number, number] | null>
	> = useCallback(
		(update) => {
			if (pendingNoteToggleRef.current) return;
			inputController.flush();
			setSelectedCell(update);
		},
		[inputController],
	);

	const handleKeyboardInput = useCallback(
		(num: number | null) => {
			if (
				pendingValueRef.current?.phase === "committing" ||
				pendingNoteToggleRef.current
			)
				return;
			cancelPendingInput();
			handleInput(num);
		},
		[cancelPendingInput, handleInput],
	);
	const handleKeyboardQuickNote = useCallback(
		(num: number) => {
			if (
				pendingValueRef.current?.phase === "committing" ||
				pendingNoteToggleRef.current
			)
				return;
			cancelPendingInput();
			handleQuickNote(num);
		},
		[cancelPendingInput, handleQuickNote],
	);
	const handleUndo = useCallback(() => {
		if (
			cancelPendingInput() ||
			pendingValueRef.current ||
			pendingNoteToggleRef.current
		)
			return;
		undo();
	}, [cancelPendingInput, undo]);
	const handleRedo = useCallback(() => {
		if (
			cancelPendingInput() ||
			pendingValueRef.current ||
			pendingNoteToggleRef.current
		)
			return;
		redo();
	}, [cancelPendingInput, redo]);
	const handleSolveAfterPending = useCallback(() => {
		if (
			pendingValueRef.current?.phase === "committing" ||
			pendingNoteToggleRef.current
		)
			return;
		cancelPendingInput();
		handleSolve();
	}, [cancelPendingInput, handleSolve]);
	const handleResetAfterPending = useCallback(() => {
		if (
			pendingValueRef.current?.phase === "committing" ||
			pendingNoteToggleRef.current
		)
			return;
		cancelPendingInput();
		handleReset();
	}, [cancelPendingInput, handleReset]);

	useGameKeyboard({
		showWin: !!winState,
		setSelectedCell: setSelectedCellAfterPending,
		handleInput: handleKeyboardInput,
		handleQuickNote: handleKeyboardQuickNote,
		onToggleNoteMode: handleToggleNoteMode,
		undo: handleUndo,
		redo: handleRedo,
	});

	const conflicts = checkBoard(currentDerivedState.current, puzzle.solution);
	const valueCounts = countValues(currentDerivedState.current);
	const disabledNumbers = getDisabledNumbers(valueCounts);
	const remainingCounts = getRemainingCounts(valueCounts);
	const visibleHintStep = getVisibleHintStep(
		hint?.steps[hintStepIndex],
		hintDisclosureStage,
	);
	const handleHintStepChange = (index: number) => {
		setHintStepIndex(index);
		setHintDisclosureStage(
			hint
				? getInitialHintDisclosureStage(hint, index)
				: INITIAL_HINT_DISCLOSURE_STAGE,
		);
	};

	return (
		<Layout
			backRedirect="/"
			mainClassName="game-page-main"
			headerClassName="game-page-header justify-between relative z-50"
			headerCenter={<Timer time={timer} />}
			headerRight={
				<GameMenu
					difficulty={puzzle.difficulty}
					score={puzzle.score}
					techniques={puzzle.techniques}
					initialBoard={puzzle.initial}
					techniqueAnalysis={puzzle.techniqueAnalysis}
					onHint={handleHint}
					onSolve={handleSolveAfterPending}
					onReset={handleResetAfterPending}
				/>
			}
		>
			<StaggeredList className="game-stack min-h-0 flex-1">
				<StaggeredListElement className="game-board-slot flex min-h-0 flex-1 items-center justify-center">
					<SudokuGrid
						className="game-board-bleed"
						initialBoard={puzzle.initial}
						currentBoard={currentDerivedState.current}
						notes={currentDerivedState.notes}
						selectedCell={selectedCell}
						onCellSelect={handleCellSelect}
						conflicts={conflicts}
						hintStep={visibleHintStep}
						pendingValue={pendingValue}
						pendingNoteToggle={pendingNoteToggle}
						isNoteMode={isNoteMode}
						disabledNumbers={disabledNumbers}
						gestureDisabled={
							pendingValue !== null || pendingNoteToggle !== null
						}
						onCellGestureArm={handleCellGestureArm}
						onCellGestureDisarm={handleCellGestureDisarm}
						onCellGestureFocus={handleCellGestureFocus}
						onCellGestureCommit={handleCellGestureCommit}
					/>
				</StaggeredListElement>
				<StaggeredListElement>
					<GameControls
						isNoteMode={isNoteMode}
						onToggleNoteMode={handleToggleNoteMode}
						onUndo={handleUndo}
						onRedo={handleRedo}
						canUndo={canUndo}
						canRedo={canRedo}
					/>
				</StaggeredListElement>
				<StaggeredListElement>
					<Numpad
						onNumberClick={handleNumpadInput}
						isNoteMode={isNoteMode}
						disabled={selectedCell === null}
						disabledNumbers={disabledNumbers}
						remainingCounts={remainingCounts}
					/>
				</StaggeredListElement>
			</StaggeredList>
			<VictoryDialog
				open={!!winState}
				time={winState?.timer ?? timer}
				difficulty={puzzle.difficulty}
				onReview={() => {
					setWinState(null);
					navigate("/review", {
						state: buildReviewState({
							puzzle,
							time: winState?.timer ?? timer,
							actions: winState?.actions ?? gameState.actions,
						}),
					});
				}}
				onHome={() => {
					setWinState(null);
					navigate("/");
				}}
			/>
			<AnimatePresence>
				{hint && (
					<HintPanel
						hint={hint}
						stepIndex={hintStepIndex}
						disclosureStage={hintDisclosureStage}
						onDisclosureStageChange={setHintDisclosureStage}
						onStepChange={handleHintStepChange}
						onClose={() => setHint(null)}
					/>
				)}
			</AnimatePresence>
		</Layout>
	);
};
