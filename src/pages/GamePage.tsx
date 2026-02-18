import type { User } from "firebase/auth";
import { Timestamp } from "firebase/firestore";
import { Trophy } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatTime } from "@/lib/utils";
import { Dialog } from "../components/Dialog";
import { GameControls } from "../components/GameControls";
import { Layout } from "../components/Layout";
import { Numpad } from "../components/Numpad";
import { PuzzleInfoDialog } from "../components/PuzzleInfoDialog";
import { SudokuGrid } from "../components/SudokuGrid";
import { Timer } from "../components/Timer";
import { DIFFICULTIES } from "../logic/constants";
import {
	markPuzzleAsPlayed,
	saveGameState,
	saveHighScore,
} from "../logic/firebase";
import { applyActions } from "../logic/gameReducer";
import { checkBoard } from "../logic/sudoku";
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

	// Compute current state from actions
	const currentDerivedState = applyActions(
		puzzle.initial,
		puzzle.solution,
		gameState.actions,
	);

	// We can find if we can undo/redo by looking at the history reconstruction in applyActions
	// But since applyActions only returns the final state, let's optimize or change how we track it.
	// For now, let's just use the derived state for rendering.

	// To know canUndo/canRedo, we actually need to know where we are in the "active" history.
	// If every undo/redo is an action, canUndo/canRedo depends on the logic in applyActions.

	// Let's modify applyActions to return more info or handle it here.
	// Actually, it's easier if GamePage just tracks the actions and we have a way to know the "effective pointer".

	const getEffectivePointer = (actions: GameAction[]) => {
		let p = 0;
		let hLen = 1; // start state
		for (const a of actions) {
			if (a.type === "undo") {
				if (p > 0) p--;
			} else if (a.type === "redo") {
				if (p < hLen - 1) p++;
			} else {
				hLen = p + 1 + 1;
				p++;
			}
		}
		return { pointer: p, historyLength: hLen };
	};

	const { pointer, historyLength } = getEffectivePointer(gameState.actions);
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
		const isComplete = gameState.current.every((row, ri) =>
			row.every((val, ci) => {
				const solRow = puzzle.solution[ri];
				return solRow ? val === solRow[ci] : false;
			}),
		);
		if (isComplete) {
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
		(newActions: GameAction[]) => {
			const newState = applyActions(
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

			// Check for win
			const isComplete = newState.current.every((row, ri) =>
				row.every((val, ci) => {
					const solRow = puzzle.solution[ri];
					return solRow ? val === solRow[ci] : false;
				}),
			);

			if (isComplete) {
				setShowWin(true);
				if (user) {
					saveHighScore({
						puzzle,
						time: timer,
						date: Timestamp.now(),
						userId: user.uid,
						userName: user.displayName || "Anonymous",
						actions: newActions,
					}).then(() => {});

					saveGameState(user.uid, {
						puzzle,
						current: newState.current,
						notes: newState.notes,
						timer: timer,
						actions: newActions,
					});

					markPuzzleAsPlayed(user.uid, puzzle.id);
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

	const undo = useCallback(() => {
		if (canUndo) {
			const newActions: GameAction[] = [
				...gameState.actions,
				{ type: "undo", delta: timer },
			];
			const newState = applyActions(
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
		}
	}, [canUndo, gameState.actions, timer, puzzle, setGameState, gameState]);

	const redo = useCallback(() => {
		if (canRedo) {
			const newActions: GameAction[] = [
				...gameState.actions,
				{ type: "redo", delta: timer },
			];
			const newState = applyActions(
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
		}
	}, [canRedo, gameState.actions, timer, puzzle, setGameState, gameState]);

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
	const counts = new Map<number, number>();
	currentDerivedState.current.forEach((row) => {
		row.forEach((val) => {
			if (val !== null) {
				counts.set(val, (counts.get(val) || 0) + 1);
			}
		});
	});
	const disabledNumbers = Array.from(counts.entries())
		.filter(([_, count]) => count >= 9)
		.map(([num]) => num);

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
							notes: Array(9)
								.fill(null)
								.map(() =>
									Array(9)
										.fill(null)
										.map(() => new Set<number>()),
								),
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
				<Numpad onNumberClick={handleInput} disabledNumbers={disabledNumbers} />
				<Dialog open={showWin} className="text-center">
					<Trophy size={64} className="text-yellow-400 mx-auto mb-4" />
					<h2 className="text-3xl font-bold mb-2">Victory!</h2>
					<div className="flex flex-col gap-1 mb-6">
						<p className="text-slate-400">Solved in {formatTime(timer)}</p>
						<p className="text-yellow-500/80 font-bold uppercase tracking-wider text-sm">
							{DIFFICULTIES.find((d) => d.id === puzzle.difficulty)?.label ||
								puzzle.difficulty}{" "}
							Difficulty
						</p>
					</div>
					<div className="flex flex-col gap-3">
						<button
							type="button"
							onClick={() => {
								setShowWin(false);
								navigate("/review", {
									state: {
										initial: puzzle.initial.flat(),
										solution: puzzle.solution.flat(),
										time: timer,
										difficulty: puzzle.difficulty,
										actions: gameState.actions,
										score: puzzle.score,
										techniques: puzzle.techniques,
									},
								});
							}}
							className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-xl font-bold transition-all border border-white/10"
						>
							Review Game
						</button>
						<button
							type="button"
							onClick={() => {
								setShowWin(false);
								navigate("/");
							}}
							className="w-full py-4 bg-brand-primary rounded-xl font-bold shadow-lg shadow-brand-primary/40 active:scale-95 transition-all text-white"
						>
							Back to Menu
						</button>
					</div>
				</Dialog>
			</div>
		</Layout>
	);
};
