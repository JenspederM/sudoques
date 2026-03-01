import type { User } from "firebase/auth";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GameControls } from "@/components/GameControls";
import { GameMenu } from "@/components/GameMenu";
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
import { buildReviewState } from "@/lib/utils";
import { clearGameState } from "../logic/firebase";
import { checkBoard, countValues, isBoardComplete } from "../logic/sudoku";
import type { GameState } from "../types";

interface GamePageProps {
	user: User | null;
	gameState: Omit<GameState, "lastUpdated" | "timer">;
	timer: number;
	setTimer: (t: number | ((prev: number) => number)) => void;
}

export const GamePage: React.FC<GamePageProps> = ({
	user,
	gameState,
	timer,
	setTimer,
}) => {
	const navigate = useNavigate();
	const [selectedCell, setSelectedCell] = useState<[number, number] | null>(
		null,
	);
	const [isNoteMode, setIsNoteMode] = useState(false);
	const [showWin, setShowWin] = useState(false);

	const { puzzle } = gameState;

	const {
		currentDerivedState,
		canUndo,
		canRedo,
		handleInput,
		undo,
		redo,
		handleSolve,
		handleHint,
		handleReset,
	} = useGameActions({
		user,
		gameState,
		timer,
		setTimer,
		setShowWin,
		selectedCell,
		isNoteMode,
	});

	// Keep track of completion status for cleanup
	const isWonRef = useRef(false);
	useEffect(() => {
		isWonRef.current = isBoardComplete(gameState.current, puzzle.solution);
	}, [gameState.current, puzzle.solution]);

	// Clear game state on unmount if won
	useEffect(() => {
		return () => {
			if (user && isWonRef.current) {
				clearGameState(user.uid).catch(console.error);
			}
		};
	}, [user]);

	// Check for win on load
	useEffect(() => {
		if (showWin) return;
		if (isBoardComplete(gameState.current, puzzle.solution)) {
			setShowWin(true);
		}
	}, [gameState, showWin, puzzle.solution]);

	// Timer logic
	useEffect(() => {
		if (showWin) return;
		const interval = setInterval(() => setTimer((t) => t + 1), 1000);
		return () => clearInterval(interval);
	}, [showWin, setTimer]);

	const handleCellSelect = (r: number, c: number) => {
		if (selectedCell !== null && selectedCell[0] === r && selectedCell[1] === c)
			setSelectedCell(null);
		else setSelectedCell([r, c]);
	};

	useGameKeyboard({
		showWin,
		setSelectedCell,
		handleInput,
		setIsNoteMode,
		undo,
		redo,
	});

	const conflicts = checkBoard(currentDerivedState.current, puzzle.solution);

	// Calculate disabled numbers (completed 9 instances)
	const valueCounts = countValues(currentDerivedState.current);
	const disabledNumbers = Array.from(valueCounts.entries())
		.filter(([_, count]) => count >= 9)
		.map(([num]) => num);

	const remainingCounts = new Map<number, number>(
		[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => [n, 9 - (valueCounts.get(n) || 0)]),
	);

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
						currentBoard={gameState.current}
						notes={gameState.notes}
						selectedCell={selectedCell}
						onCellSelect={handleCellSelect}
						conflicts={conflicts}
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
						disabledNumbers={disabledNumbers}
						remainingCounts={remainingCounts}
					/>
				</StaggeredListElement>
			</StaggeredList>
			<VictoryDialog
				open={showWin}
				time={timer}
				difficulty={puzzle.difficulty}
				onReview={() => {
					setShowWin(false);
					navigate("/review", {
						state: buildReviewState({
							initial: puzzle.initial,
							solution: puzzle.solution,
							time: timer,
							difficulty: puzzle.difficulty,
							actions: gameState.actions,
							score: puzzle.score,
							techniques: puzzle.techniques,
						}),
					});
				}}
				onHome={() => {
					setShowWin(false);
					navigate("/");
				}}
			/>
		</Layout>
	);
};
