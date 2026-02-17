import type { User } from "firebase/auth";
import { Timestamp } from "firebase/firestore";
import { AnimatePresence, motion } from "framer-motion";
import { Timer, Trophy } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MotionCard } from "@/components/MotionCard";
import { formatTime } from "@/lib/utils";
import { GameControls } from "../components/GameControls";
import { Layout } from "../components/Layout";
import { Numpad } from "../components/Numpad";
import { SudokuGrid } from "../components/SudokuGrid";
import { DIFFICULTIES } from "../logic/constants";
import {
	markPuzzleAsPlayed,
	saveGameState,
	saveHighScore,
} from "../logic/firebase";
import { applyActions } from "../logic/gameReducer";
import { checkBoard } from "../logic/sudoku";
import type { Difficulty, GameAction, GameState } from "../types";

interface GamePageProps {
	user: User | null;
	gameState: Omit<GameState, "lastUpdated" | "timer">;
	setGameState: (state: GamePageProps["gameState"]) => void;
	timer: number;
	setTimer: (t: number | ((prev: number) => number)) => void;
	difficulty: Difficulty;
}

export const GamePage: React.FC<GamePageProps> = ({
	user,
	gameState,
	setGameState,
	timer,
	setTimer,
	difficulty,
}) => {
	const navigate = useNavigate();
	const [selectedCell, setSelectedCell] = useState<[number, number] | null>(
		null,
	);
	const [isNoteMode, setIsNoteMode] = useState(false);
	const [showWin, setShowWin] = useState(false);

	// Compute current state from actions
	const currentDerivedState = applyActions(
		gameState.initial,
		gameState.solution,
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
					initial: gameState.initial,
					current: gameState.current,
					notes: gameState.notes,
					solution: gameState.solution,
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
				const solRow = gameState.solution[ri];
				return solRow ? val === solRow[ci] : false;
			}),
		);
		if (isComplete) {
			setShowWin(true);
		}
	}, [gameState, showWin]);

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

	const commitActions = (newActions: GameAction[]) => {
		const newState = applyActions(
			gameState.initial,
			gameState.solution,
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
				const solRow = gameState.solution[ri];
				return solRow ? val === solRow[ci] : false;
			}),
		);

		if (isComplete) {
			setShowWin(true);
			if (user) {
				saveHighScore({
					difficulty,
					time: timer,
					date: Timestamp.now(),
					userId: user.uid,
					userName: user.displayName || "Anonymous",
					initial: gameState.initial.flat(),
					solution: gameState.solution.flat(),
					actions: newActions,
				}).then(() => {});

				saveGameState(user.uid, {
					initial: gameState.initial,
					current: newState.current,
					notes: newState.notes,
					solution: gameState.solution,
					timer: timer,
					actions: newActions,
				});

				if (gameState.puzzleId) {
					markPuzzleAsPlayed(user.uid, gameState.puzzleId);
				}
			}
		}
	};

	const handleInput = (num: number | null) => {
		if (!selectedCell) return;
		const [r, c] = selectedCell;
		const initialRow = gameState.initial[r];
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
	};

	const undo = () => {
		if (canUndo) {
			const newActions: GameAction[] = [
				...gameState.actions,
				{ type: "undo", delta: timer },
			];
			const newState = applyActions(
				gameState.initial,
				gameState.solution,
				newActions,
			);
			setGameState({
				...gameState,
				current: newState.current,
				notes: newState.notes,
				actions: newActions,
			});
		}
	};

	const redo = () => {
		if (canRedo) {
			const newActions: GameAction[] = [
				...gameState.actions,
				{ type: "redo", delta: timer },
			];
			const newState = applyActions(
				gameState.initial,
				gameState.solution,
				newActions,
			);
			setGameState({
				...gameState,
				current: newState.current,
				notes: newState.notes,
				actions: newActions,
			});
		}
	};

	const conflicts = checkBoard(currentDerivedState.current, gameState.solution);

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
			headerChildren={
				<>
					<div className="flex items-center gap-1.5 sm:gap-2 text-brand-primary">
						<Timer size={20} />
						<span data-testid="timer" className="font-mono text-lg sm:text-xl">
							{formatTime(timer)}
						</span>
					</div>
					<div className="flex items-center gap-2 text-yellow-500">
						<Trophy size={20} />
						<span className="font-bold">
							{DIFFICULTIES.find((d) => d.id === difficulty)?.label ||
								difficulty}
						</span>
					</div>
				</>
			}
		>
			{/* Grid */}
			<div className="flex flex-col flex-1 sm:flex-0 w-full">
				<div className="w-full">
					<SudokuGrid
						initialBoard={gameState.initial}
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
							current: gameState.initial.map((r) => [...r]),
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
				{import.meta.env?.NODE_ENV !== "production" && (
					<button
						type="button"
						onClick={() => {
							const solveActions: GameAction[] = [];
							for (let r = 0; r < 9; r++) {
								const initialRow = gameState.initial[r];
								const solutionRow = gameState.solution[r];
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
				<AnimatePresence>
					{showWin && (
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-6"
						>
							<MotionCard
								initial={{ scale: 0.9, y: 20 }}
								animate={{ scale: 1, y: 0 }}
								className="glass p-10 rounded-3xl text-center"
							>
								<Trophy size={64} className="text-yellow-400 mx-auto mb-4" />
								<h2 className="text-3xl font-bold mb-2">Victory!</h2>
								<div className="flex flex-col gap-1 mb-6">
									<p className="text-slate-400">
										Solved in {formatTime(timer)}
									</p>
									<p className="text-yellow-500/80 font-bold uppercase tracking-wider text-sm">
										{DIFFICULTIES.find((d) => d.id === difficulty)?.label ||
											difficulty}{" "}
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
													initial: gameState.initial.flat(),
													solution: gameState.solution.flat(),
													time: timer,
													difficulty: difficulty,
													actions: gameState.actions,
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
							</MotionCard>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</Layout>
	);
};
