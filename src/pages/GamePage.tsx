import type { User } from "firebase/auth";
import { AnimatePresence } from "framer-motion";
import type React from "react";
import { useEffect, useRef, useState } from "react";
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
import { useGameActions } from "@/hooks/useGameActions";
import { useGameKeyboard } from "@/hooks/useGameKeyboard";
import { useGameTimer } from "@/hooks/useGameTimer";
import { buildReviewState } from "@/lib/utils";
import {
	type ExplainableHint,
	findExplainableHint,
} from "@/logic/explainableSolver";
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

export const GamePage: React.FC<GamePageProps> = ({
	user,
	gameState,
	timer: initialTime,
}) => {
	const navigate = useNavigate();
	const [selectedCell, setSelectedCell] = useState<[number, number] | null>(
		null,
	);
	const [isNoteMode, setIsNoteMode] = useState(false);
	const [hint, setHint] = useState<ExplainableHint | null>(null);
	const [hintStepIndex, setHintStepIndex] = useState(0);
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

	const {
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
	} = useGameActions({
		user,
		gameState,
		timer,
		setTimer,
		setWinState,
		selectedCell,
		isNoteMode,
	});

	const handleHint = () => {
		setSelectedCell(null);
		setHintStepIndex(0);
		setHint(
			findExplainableHint(
				currentDerivedState.current,
				puzzle.initial,
				puzzle.solution,
				{
					difficulty: puzzle.difficulty,
					techniques: puzzle.techniques,
				},
			),
		);
	};

	useEffect(() => {
		if (previousActionCount.current !== actionCount) {
			setHint(null);
			setHintStepIndex(0);
		}
		previousActionCount.current = actionCount;
	}, [actionCount]);

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
				saveCurrentStateRef.current(timerRef.current);
			}
		};

		const handlePageHide = () => {
			saveCurrentStateRef.current(timerRef.current);
		};

		window.addEventListener("visibilitychange", handleVisibilityChange);
		window.addEventListener("pagehide", handlePageHide);

		return () => {
			window.removeEventListener("visibilitychange", handleVisibilityChange);
			window.removeEventListener("pagehide", handlePageHide);
			saveCurrentStateRef.current(timerRef.current);
		};
	}, []);

	const handleCellSelect = (r: number, c: number) => {
		if (selectedCell !== null && selectedCell[0] === r && selectedCell[1] === c)
			setSelectedCell(null);
		else setSelectedCell([r, c]);
	};

	useGameKeyboard({
		showWin: !!winState,
		setSelectedCell,
		handleInput,
		handleQuickNote,
		setIsNoteMode,
		undo,
		redo,
	});

	const conflicts = checkBoard(currentDerivedState.current, puzzle.solution);
	const valueCounts = countValues(currentDerivedState.current);
	const disabledNumbers = getDisabledNumbers(valueCounts);
	const remainingCounts = getRemainingCounts(valueCounts);

	return (
		<Layout
			backRedirect="/"
			headerClassName="justify-between relative z-50"
			headerCenter={<Timer time={timer} />}
			headerRight={
				<GameMenu
					difficulty={puzzle.difficulty}
					score={puzzle.score}
					techniques={puzzle.techniques}
					onHint={handleHint}
					onSolve={handleSolve}
					onReset={handleReset}
				/>
			}
		>
			<StaggeredList className="h-full">
				<StaggeredListElement className="flex flex-col flex-1 sm:flex-0 ">
					<SudokuGrid
						initialBoard={puzzle.initial}
						currentBoard={currentDerivedState.current}
						notes={currentDerivedState.notes}
						selectedCell={selectedCell}
						onCellSelect={handleCellSelect}
						conflicts={conflicts}
						hintStep={hint?.steps[hintStepIndex] ?? null}
					/>
				</StaggeredListElement>
				<StaggeredListElement>
					<GameControls
						isNoteMode={isNoteMode}
						onToggleNoteMode={() => setIsNoteMode(!isNoteMode)}
						onUndo={undo}
						onRedo={redo}
						canUndo={canUndo}
						canRedo={canRedo}
					/>
				</StaggeredListElement>
				<StaggeredListElement>
					<Numpad
						onNumberClick={handleInput}
						onQuickNote={handleQuickNote}
						isNoteMode={isNoteMode}
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
						onStepChange={setHintStepIndex}
						onClose={() => setHint(null)}
					/>
				)}
			</AnimatePresence>
		</Layout>
	);
};
