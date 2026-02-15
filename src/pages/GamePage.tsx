import type { User } from "firebase/auth";
import { Timestamp } from "firebase/firestore";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, Timer, Trophy } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GameControls } from "../components/GameControls";
import { Layout } from "../components/Layout";
import { Numpad } from "../components/Numpad";
import { SudokuGrid } from "../components/SudokuGrid";
import { saveGameState, saveHighScore } from "../logic/firebase";
import type { Board, CellNotes } from "../logic/sudoku";
import { checkBoard } from "../logic/sudoku";
import { DIFFICULTIES } from "../logic/constants";

interface GamePageProps {
	user: User | null;
	gameState: {
		initial: Board;
		current: Board;
		notes: CellNotes;
		solution: Board;
	};
	setGameState: (state: any) => void;
	timer: number;
	setTimer: (t: number | ((prev: number) => number)) => void;
	difficulty: string;
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
	const [history, setHistory] = useState<Board[]>([
		gameState.current.map((r) => [...r]),
	]);
	const [historyPointer, setHistoryPointer] = useState(0);
	const [showWin, setShowWin] = useState(false);

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

	const handleInput = (num: number | null) => {
		if (!selectedCell) return;
		const [r, c] = selectedCell;
		const initialRow = gameState.initial[r];
		if (!initialRow || initialRow[c] !== null) return;

		if (isNoteMode && num !== null) {
			const newNotes = [...gameState.notes];
			const rowNotes = newNotes[r];
			if (!rowNotes) return;
			const targetCellNotes = rowNotes[c];
			if (!targetCellNotes) return;
			const cellNotes = new Set(targetCellNotes);
			if (cellNotes.has(num)) {
				cellNotes.delete(num);
			} else {
				cellNotes.add(num);
			}
			rowNotes[c] = cellNotes;
			setGameState({ ...gameState, notes: newNotes });
		} else {
			const newBoard = gameState.current.map((row) => [...row]);
			const newBoardRow = newBoard[r];
			const newNotes = gameState.notes.map((row) =>
				row.map((cell) => new Set(cell)),
			);

			// If the value hasn't changed (and it's not a clear action), don't update
			if (num !== null && newBoardRow && newBoardRow[c] === num) return;

			if (newBoardRow) {
				newBoardRow[c] = num;
			}

			// If erasing, also clear notes
			if (num === null) {
				const targetRowNotes = newNotes[r];
				if (targetRowNotes) {
					targetRowNotes[c] = new Set<number>();
				}
			}

			// Auto-remove notes if a number is completed
			if (num !== null) {
				// Calculate counts after placing the new number
				const counts = new Map<number, number>();
				newBoard.forEach((row) => {
					row.forEach((val) => {
						if (val !== null) {
							counts.set(val, (counts.get(val) || 0) + 1);
						}
					});
				});

				if ((counts.get(num) || 0) >= 9) {
					// Remove this number from all notes
					for (let i = 0; i < 9; i++) {
						const rowNotes = newNotes[i];
						if (rowNotes) {
							for (let j = 0; j < 9; j++) {
								const cellNotes = rowNotes[j];
								if (cellNotes) {
									cellNotes.delete(num);
								}
							}
						}
					}
				}
			}

			// Update history
			const newHistory = history.slice(0, historyPointer + 1);
			newHistory.push(newBoard.map((row) => [...row]));
			setHistory(newHistory);
			setHistoryPointer(newHistory.length - 1);

			setGameState({ ...gameState, current: newBoard, notes: newNotes });

			// Check for win
			const isComplete = newBoard.every((row, ri) =>
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
					}).then(() => {});
					// Also save the final game state so it's marked as complete in DB
					saveGameState(user.uid, {
						initial: gameState.initial,
						current: newBoard,
						notes: newNotes,
						solution: gameState.solution,
						timer: timer,
					});
				}
			}
		}
	};

	const undo = () => {
		if (historyPointer > 0) {
			const prevBoard = history[historyPointer - 1];
			if (!prevBoard) return;
			setGameState({ ...gameState, current: prevBoard.map((row) => [...row]) });
			setHistoryPointer(historyPointer - 1);
		}
	};

	const redo = () => {
		if (historyPointer < history.length - 1) {
			const nextBoard = history[historyPointer + 1];
			if (!nextBoard) return;
			setGameState({ ...gameState, current: nextBoard.map((row) => [...row]) });
			setHistoryPointer(historyPointer + 1);
		}
	};

	const formatTime = (s: number) => {
		const mins = Math.floor(s / 60);
		const secs = s % 60;
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	};

	const conflicts = checkBoard(gameState.current, gameState.solution);

	// Calculate disabled numbers (completed 9 instances)
	const counts = new Map<number, number>();
	gameState.current.forEach((row) => {
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
						});
						setTimer(0);
					}}
					canUndo={historyPointer > 0}
					canRedo={historyPointer < history.length - 1}
				/>
				<Numpad onNumberClick={handleInput} disabledNumbers={disabledNumbers} />
				<AnimatePresence>
					{showWin && (
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-6"
						>
							<motion.div
								initial={{ scale: 0.9, y: 20 }}
								animate={{ scale: 1, y: 0 }}
								className="glass p-10 rounded-3xl text-center max-w-sm"
							>
								<Trophy size={64} className="text-yellow-400 mx-auto mb-4" />
								<h2 className="text-3xl font-bold mb-2">Victory!</h2>
								<p className="text-slate-400 mb-6">
									Solved in {formatTime(timer)}
								</p>
								<button
									type="button"
									onClick={() => {
										setShowWin(false);
										navigate("/");
									}}
									className="w-full py-4 bg-brand-primary rounded-xl font-bold shadow-lg shadow-brand-primary/40 active:scale-95 transition-all"
								>
									Back to Menu
								</button>
							</motion.div>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</Layout>
	);
};
