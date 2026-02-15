import { Timer, Trophy } from "lucide-react";
import type React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { SudokuGrid } from "../components/SudokuGrid";
import { DIFFICULTIES } from "../logic/constants";
import type { Board } from "../logic/sudoku";

interface ReviewPageState {
	initial: number[];
	solution: number[];
	time: number;
	difficulty: string;
}

export const ReviewPage: React.FC = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const state = location.state as ReviewPageState;

	if (!state || !state.initial || !state.solution) {
		return (
			<Layout>
				<div className="flex flex-col items-center justify-center min-h-screen">
					<p className="text-white mb-4">No game data found.</p>
					<button
						type="button"
						onClick={() => navigate("/statistics")}
						className="px-4 py-2 bg-brand-primary rounded-lg text-white"
					>
						Back to Statistics
					</button>
				</div>
			</Layout>
		);
	}

	const formatTime = (s: number) => {
		const mins = Math.floor(s / 60);
		const secs = s % 60;
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	};

	// Unflatten arrays
	const unflatten = (arr: number[]): Board => {
		const result: Board = [];
		for (let i = 0; i < 9; i++) {
			result.push(arr.slice(i * 9, (i + 1) * 9));
		}
		return result;
	};

	const initialBoard = unflatten(state.initial);
	const solutionBoard = unflatten(state.solution);
	// For review, current board is the solution
	const currentBoard = solutionBoard;

	// Empty notes
	const notes = Array(9)
		.fill(null)
		.map(() =>
			Array(9)
				.fill(null)
				.map(() => new Set<number>()),
		);

	return (
		<Layout
			backRedirect="/statistics"
			headerClassName="justify-between"
			headerChildren={
				<>
					<div className="flex items-center gap-1.5 sm:gap-2 text-brand-primary">
						<Timer size={20} />
						<span data-testid="timer" className="font-mono text-lg sm:text-xl">
							{formatTime(state.time)}
						</span>
					</div>
					<div className="flex items-center gap-2 text-yellow-500">
						<Trophy size={20} />
						<span className="font-bold">
							{DIFFICULTIES.find((d) => d.id === state.difficulty)?.label ||
								state.difficulty}
						</span>
					</div>
				</>
			}
		>
			{/* Grid */}
			<div className="w-full flex justify-center py-2 pointer-events-none opacity-90">
				<SudokuGrid
					initialBoard={initialBoard}
					currentBoard={currentBoard}
					notes={notes}
					selectedCell={null}
					onCellSelect={() => {}}
					conflicts={[]}
				/>
			</div>
		</Layout>
	);
};
