import {
	Pause,
	Play,
	SkipBack,
	SkipForward,
	Timer,
	Trophy,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { unflattenBoard } from "@/lib/utils";
import { Layout } from "../components/Layout";
import { SudokuGrid } from "../components/SudokuGrid";
import { DIFFICULTIES } from "../logic/constants";
import { applyActions } from "../logic/gameReducer";
import type { DBBoard, GameAction } from "../types";

interface ReviewPageState {
	initial: DBBoard;
	solution: DBBoard;
	time: number;
	difficulty: string;
	actions?: GameAction[];
}

export const ReviewPage: React.FC = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const state = location.state as ReviewPageState;

	const [playbackIndex, setPlaybackIndex] = useState(0);
	const [isPlaying, setIsPlaying] = useState(false);

	const actions = state?.actions || [];
	const totalSteps = actions.length;

	useEffect(() => {
		if (isPlaying && playbackIndex < totalSteps) {
			const timer = setTimeout(() => {
				setPlaybackIndex((prev) => prev + 1);
			}, 500);
			return () => clearTimeout(timer);
		} else if (playbackIndex >= totalSteps) {
			setIsPlaying(false);
		}
	}, [isPlaying, playbackIndex, totalSteps]);

	const initialBoard = useMemo(
		() => unflattenBoard(state?.initial || []),
		[state?.initial],
	);
	const solutionBoard = useMemo(
		() => unflattenBoard(state?.solution || []),
		[state?.solution],
	);

	const currentDerivedState = useMemo(() => {
		return applyActions(
			initialBoard,
			solutionBoard,
			actions.slice(0, playbackIndex),
		);
	}, [initialBoard, solutionBoard, actions, playbackIndex]);

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

	const initialBoardActual = initialBoard;
	const currentBoard = currentDerivedState.current;
	const notes = currentDerivedState.notes;

	return (
		<Layout
			backRedirect="/statistics"
			backState={{ activeDiff: state.difficulty }}
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
			<div className="w-full flex justify-center py-2 opacity-90">
				<SudokuGrid
					initialBoard={initialBoardActual}
					currentBoard={currentBoard}
					notes={notes}
					selectedCell={null}
					onCellSelect={() => {}}
					conflicts={[]}
				/>
			</div>

			{/* Playback Controls */}
			{actions.length > 0 && (
				<div className="w-full flex flex-col items-center gap-6 mt-4 pb-8">
					<div className="flex items-center gap-8">
						<button
							type="button"
							onClick={() => setPlaybackIndex((prev) => Math.max(0, prev - 1))}
							className="p-3 text-slate-400 hover:text-white transition-colors"
						>
							<SkipBack size={28} />
						</button>

						<button
							type="button"
							onClick={() => setIsPlaying(!isPlaying)}
							className="w-16 h-16 flex items-center justify-center bg-brand-primary rounded-full text-white shadow-lg shadow-brand-primary/30 hover:scale-105 active:scale-95 transition-all"
						>
							{isPlaying ? (
								<Pause size={32} fill="currentColor" />
							) : (
								<Play size={32} fill="currentColor" className="ml-1" />
							)}
						</button>

						<button
							type="button"
							onClick={() =>
								setPlaybackIndex((prev) => Math.min(totalSteps, prev + 1))
							}
							className="p-3 text-slate-400 hover:text-white transition-colors"
						>
							<SkipForward size={28} />
						</button>
					</div>

					<div className="w-full max-w-md px-4 flex flex-col gap-2">
						<div className="flex justify-between text-xs font-medium text-slate-500 uppercase tracking-wider">
							<span>Start</span>
							<span>
								{playbackIndex} / {totalSteps} moves
							</span>
							<span>Finish</span>
						</div>
						<input
							type="range"
							min="0"
							max={totalSteps}
							value={playbackIndex}
							onChange={(e) => setPlaybackIndex(parseInt(e.target.value, 10))}
							className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-primary"
						/>
					</div>
				</div>
			)}
		</Layout>
	);
};
