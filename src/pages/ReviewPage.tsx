import { ChevronLeft, Timer, Trophy } from "lucide-react";
import type React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { SudokuGrid } from "../components/SudokuGrid";
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
						onClick={() => navigate("/leaderboard")}
						className="px-4 py-2 bg-brand-primary rounded-lg text-white"
					>
						Back to Leaderboard
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
		<Layout>
			<div className="page-container px-2 sm:px-4">
				<div className="content-wrapper flex-1 justify-center sm:justify-start">
					{/* Header Info */}
					<div className="w-full flex items-center justify-between glass px-4 py-2 sm:px-6 sm:py-3 rounded-2xl shrink-0">
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={() => navigate("/leaderboard")}
								className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"
								title="Back to Leaderboard"
							>
								<ChevronLeft size={24} />
							</button>
						</div>
						<div className="flex items-center gap-1.5 sm:gap-2 text-brand-primary">
							<Timer size={20} />
							<span
								data-testid="timer"
								className="font-mono text-lg sm:text-xl"
							>
								{formatTime(state.time)}
							</span>
						</div>
						<div className="flex items-center gap-2 text-yellow-500">
							<Trophy size={20} />
							<span className="font-bold">{state.difficulty}</span>
						</div>
					</div>

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
				</div>
			</div>
		</Layout>
	);
};
