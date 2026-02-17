import {
	Pause,
	Play,
	SkipBack,
	SkipForward,
	Timer,
	Trophy,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { formatTime, unflattenBoard } from "@/lib/utils";
import { Layout } from "../components/Layout";
import { SudokuGrid } from "../components/SudokuGrid";
import { DIFFICULTIES } from "../logic/constants";
import { applyActions } from "../logic/gameReducer";
import type { DBBoard, Difficulty, GameAction } from "../types";

interface ReviewPageState {
	initial: DBBoard;
	solution: DBBoard;
	time: number;
	difficulty: Difficulty;
	actions?: GameAction[];
}

export const ReviewPage: React.FC = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const state = location.state as ReviewPageState;

	const [playbackTime, setPlaybackTime] = useState(0);
	const [isPlaying, setIsPlaying] = useState(false);
	const [speedMultiplier, setSpeedMultiplier] = useState(1);
	const lastTickRef = useRef<number>(0);

	const actions = state?.actions || [];
	const totalTime = state?.time || 0;

	// Compute the playback index from the current playback time
	const playbackIndex = useMemo(() => {
		let index = 0;
		for (let i = 0; i < actions.length; i++) {
			const action = actions[i];
			if (action && action.delta <= playbackTime) {
				index = i + 1;
			} else {
				break;
			}
		}
		return index;
	}, [actions, playbackTime]);

	// Timer tick effect
	useEffect(() => {
		if (!isPlaying) {
			lastTickRef.current = 0;
			return;
		}

		let animId: number;
		const tick = (timestamp: number) => {
			if (lastTickRef.current === 0) {
				lastTickRef.current = timestamp;
			}
			const elapsed = (timestamp - lastTickRef.current) / 1000;
			lastTickRef.current = timestamp;

			setPlaybackTime((prev) => {
				const next = prev + elapsed * speedMultiplier;
				if (next >= totalTime) {
					setIsPlaying(false);
					return totalTime;
				}
				return next;
			});

			animId = requestAnimationFrame(tick);
		};

		animId = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(animId);
	}, [isPlaying, speedMultiplier, totalTime]);

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

	const stepForward = useCallback(() => {
		const nextAction = actions[playbackIndex];
		if (nextAction) {
			setPlaybackTime(nextAction.delta);
		} else {
			setPlaybackTime(totalTime);
		}
	}, [actions, playbackIndex, totalTime]);

	const stepBack = useCallback(() => {
		if (playbackIndex > 0) {
			const prevAction = actions[playbackIndex - 1];
			// Go to just before this action's timestamp
			const prevTime =
				playbackIndex >= 2 ? (actions[playbackIndex - 2]?.delta ?? 0) : 0;
			// If we're exactly at prevAction's time, go further back
			if (prevAction && playbackTime <= prevAction.delta) {
				setPlaybackTime(prevTime);
			} else {
				setPlaybackTime(prevAction?.delta ?? 0);
			}
		} else {
			setPlaybackTime(0);
		}
	}, [actions, playbackIndex, playbackTime]);

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
							{formatTime(Math.floor(playbackTime))}
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
					initialBoard={initialBoard}
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
							onClick={stepBack}
							className="p-3 text-slate-400 hover:text-white transition-colors"
						>
							<SkipBack size={28} />
						</button>

						<button
							type="button"
							onClick={() => {
								if (playbackTime >= totalTime) {
									setPlaybackTime(0);
								}
								setIsPlaying(!isPlaying);
							}}
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
							onClick={stepForward}
							className="p-3 text-slate-400 hover:text-white transition-colors"
						>
							<SkipForward size={28} />
						</button>
					</div>

					<div className="w-full max-w-md px-4 flex flex-col gap-2">
						<div className="flex justify-between text-xs font-medium text-slate-500 uppercase tracking-wider">
							<span>{formatTime(0)}</span>
							<span>
								{playbackIndex} / {actions.length} moves
							</span>
							<span>{formatTime(totalTime)}</span>
						</div>
						<input
							type="range"
							min="0"
							max={totalTime * 100}
							value={Math.floor(playbackTime * 100)}
							onChange={(e) =>
								setPlaybackTime(parseInt(e.target.value, 10) / 100)
							}
							className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-primary"
						/>
					</div>

					{/* Speed Controls */}
					<div className="flex items-center gap-2 bg-slate-900/50 p-1 rounded-xl border border-white/5">
						{[1, 2, 4, 8, 16, 32].map((speed) => (
							<button
								key={speed}
								type="button"
								onClick={() => setSpeedMultiplier(speed)}
								className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
									speedMultiplier === speed
										? "bg-brand-primary text-white"
										: "text-slate-500 hover:text-white"
								}`}
							>
								{speed}x
							</button>
						))}
					</div>
				</div>
			)}
		</Layout>
	);
};
