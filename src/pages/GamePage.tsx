import type { User } from "firebase/auth";
import { Timestamp } from "firebase/firestore";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { buildReviewState } from "@/lib/utils";
import { GameControls } from "../components/GameControls";
import { Layout } from "../components/Layout";
import { Numpad } from "../components/Numpad";
import { PuzzleInfoDialog } from "../components/PuzzleInfoDialog";
import { SudokuGrid } from "../components/SudokuGrid";
import { Timer } from "../components/Timer";
import { VictoryDialog } from "../components/VictoryDialog";
import {
	markPuzzleAsPlayed,
	saveGameState,
	saveHighScore,
} from "../logic/firebase";
import { applyActions } from "../logic/gameReducer";
import {
	checkBoard,
	countValues,
	createEmptyNotes,
	isBoardComplete,
} from "../logic/sudoku";
import type { GameAction, GameState } from "../types";

interface GamePageProps {
	user: User | null;
	gameState: Omit<GameState, "lastUpdated" | "timer">;
	setGameState: (state: GamePageProps["gameState"]) => void;
	timer: number;
	setTimer: (t: number | ((prev: number) => number)) => void;
}

export const GamePage: React.FC<GamePageProps> = ({
	user,
	gameState,
	setGameState,
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

	// Compute current state and undo/redo info from actions
	const {
		state: currentDerivedState,
		pointer,
		historyLength,
	} = applyActions(puzzle.initial, puzzle.solution, gameState.actions);

	const canUndo = pointer > 0;
	const canRedo = pointer < historyLength - 1;

	// Persistence effect: Save game
	useEffect(() => {
		if (user && gameState) {
			const timeout = setTimeout(() => {
				saveGameState(user.uid, {
					puzzle: gameState.puzzle,
					current: gameState.current,
					notes: gameState.notes,
					timer: timer,
					actions: gameState.actions,
				});
			}, 1000); // Debounce save
			return () => clearTimeout(timeout);
		}
	}, [user, gameState, timer]);

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

	const commitActions = useCallback(
		async (newActions: GameAction[]) => {
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

			if (isBoardComplete(newState.current, puzzle.solution)) {
				setShowWin(true);
				if (user) {
					await Promise.all([
						saveHighScore({
							puzzle,
							time: timer,
							date: Timestamp.now(),
							userId: user.uid,
							userName: user.displayName || "Anonymous",
							actions: newActions,
						}),
						saveGameState(user.uid, {
							puzzle,
							current: newState.current,
							notes: newState.notes,
							timer: timer,
							actions: newActions,
						}),
						markPuzzleAsPlayed(user.uid, puzzle.id),
					]);
				}
			}
		},
		[puzzle, setGameState, gameState, user, timer],
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

	// Keyboard support
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Don't handle keyboard if a dialog is open (simple check for showWin)
			if (showWin) return;

			// Navigation
			if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
				e.preventDefault();
				setSelectedCell((prev) => {
					if (!prev) return [0, 0];
					const [r, c] = prev;
					let nr = r;
					let nc = c;
					if (e.key === "ArrowUp") nr = Math.max(0, r - 1);
					if (e.key === "ArrowDown") nr = Math.min(8, r + 1);
					if (e.key === "ArrowLeft") nc = Math.max(0, c - 1);
					if (e.key === "ArrowRight") nc = Math.min(8, c + 1);
					return [nr, nc];
				});
				return;
			}

			// Number input (1-9)
			if (/^[1-9]$/.test(e.key)) {
				handleInput(parseInt(e.key, 10));
				return;
			}

			// Clear cell (Backspace or Delete)
			if (e.key === "Backspace" || e.key === "Delete") {
				handleInput(null);
				return;
			}

			// Toggle note mode ('n' or 'N')
			if (e.key.toLowerCase() === "n") {
				setIsNoteMode((prev) => !prev);
				return;
			}

			// Undo/Redo (Ctrl+Z / Cmd+Z)
			if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
				e.preventDefault();
				if (e.shiftKey) {
					redo();
				} else {
					undo();
				}
				return;
			}

			// Redo also with Ctrl+Y / Cmd+Y
			if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
				e.preventDefault();
				redo();
				return;
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [showWin, handleInput, undo, redo]); // stable dependencies

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
			contentClassName="mb-8"
			headerClassName="justify-between"
			headerCenter={<Timer time={timer} />}
			headerRight={
				<PuzzleInfoDialog
					difficulty={puzzle.difficulty}
					score={puzzle.score}
					techniques={puzzle.techniques}
				/>
			}
		>
			{/* Grid */}
			<div className="flex flex-col flex-1 sm:flex-0 w-full">
				<div className="w-full">
					<SudokuGrid
						initialBoard={puzzle.initial}
						currentBoard={gameState.current}
						notes={gameState.notes}
						selectedCell={selectedCell}
						onCellSelect={handleCellSelect}
						conflicts={conflicts}
					/>
				</div>
			</div>

			{/* Controls & Numpad */}
			<div className="w-full flex flex-col items-center gap-4">
				<GameControls
					isNoteMode={isNoteMode}
					onToggleNoteMode={() => setIsNoteMode(!isNoteMode)}
					onUndo={undo}
					onRedo={redo}
					onRestart={() => {
						setGameState({
							...gameState,
							current: puzzle.initial.map((r) => [...r]),
							notes: createEmptyNotes(),
							actions: [],
						});
						setTimer(0);
					}}
					canUndo={canUndo}
					canRedo={canRedo}
				/>
				{import.meta.env.DEV && (
					<button
						type="button"
						onClick={() => {
							const solveActions: GameAction[] = [];
							for (let r = 0; r < 9; r++) {
								const initialRow = puzzle.initial[r];
								const solutionRow = puzzle.solution[r];
								if (!initialRow || !solutionRow) continue;
								for (let c = 0; c < 9; c++) {
									const value = solutionRow[c];
									if (initialRow[c] === null && value != null) {
										solveActions.push({
											type: "addValue",
											delta: timer,
											payload: { row: r, col: c, value },
										});
									}
								}
							}
							commitActions([...gameState.actions, ...solveActions]);
						}}
						className="px-4 py-2 bg-red-500/20 text-red-500 rounded-lg font-bold border border-red-500/50 hover:bg-red-500/30 transition-all text-xs uppercase tracking-widest"
					>
						Solve (Dev Only)
					</button>
				)}
				<Numpad
					onNumberClick={handleInput}
					disabledNumbers={disabledNumbers}
					remainingCounts={remainingCounts}
				/>
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
			</div>
		</Layout>
	);
};
