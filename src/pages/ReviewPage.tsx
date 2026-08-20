import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { GameMenu } from "@/components/GameMenu";
import { Layout } from "@/components/Layout";
import { SudokuGrid } from "@/components/SudokuGrid";
import { Timer } from "@/components/Timer";
import {
	advanceReplayPlayback,
	createReplayPlaybackState,
	seekReplayPlayback,
	stepReplayBack,
	stepReplayForward,
	toggleReplayPlayback,
} from "@/lib/replayPlayback";
import { formatTime, unflattenBoard } from "@/lib/utils";
import { applyActions } from "@/logic/gameReducer";
import type {
	DBBoard,
	Difficulty,
	GameAction,
	LogicalTechniqueAnalysis,
} from "@/types";

interface ReviewPageState {
	initial: DBBoard;
	solution: DBBoard;
	time: number;
	difficulty: Difficulty;
	actions?: GameAction[];
	score?: number;
	techniques?: string[];
	techniqueAnalysis?: LogicalTechniqueAnalysis;
}

export const ReviewPage: React.FC = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const state = location.state as ReviewPageState;
	const actions = state?.actions || [];
	const totalTime = state?.time || 0;

	const [playback, setPlayback] = useState(() =>
		createReplayPlaybackState(actions),
	);
	const [speedMultiplier, setSpeedMultiplier] = useState(1);
	const lastTickRef = useRef<number>(0);
	const animationFrameRef = useRef<number | null>(null);

	// Timer tick effect
	useEffect(() => {
		if (!playback.isPlaying) {
			lastTickRef.current = 0;
			return;
		}

		const tick = (timestamp: number) => {
			if (lastTickRef.current === 0) {
				lastTickRef.current = timestamp;
				animationFrameRef.current = requestAnimationFrame(tick);
				return;
			}
			const elapsed = (timestamp - lastTickRef.current) / 1000;
			lastTickRef.current = timestamp;

			setPlayback((current) =>
				advanceReplayPlayback(
					actions,
					current,
					elapsed,
					speedMultiplier,
					totalTime,
				),
			);

			animationFrameRef.current = requestAnimationFrame(tick);
		};

		animationFrameRef.current = requestAnimationFrame(tick);
		return () => {
			if (animationFrameRef.current !== null) {
				cancelAnimationFrame(animationFrameRef.current);
				animationFrameRef.current = null;
			}
		};
	}, [actions, playback.isPlaying, speedMultiplier, totalTime]);

	const initialBoard = useMemo(
		() => unflattenBoard(state?.initial || []),
		[state?.initial],
	);
	const solutionBoard = useMemo(
		() => unflattenBoard(state?.solution || []),
		[state?.solution],
	);

	const currentDerivedState = applyActions(
		initialBoard,
		solutionBoard,
		actions.slice(0, playback.actionIndex),
	).state;

	const stepForward = useCallback(() => {
		if (animationFrameRef.current !== null) {
			cancelAnimationFrame(animationFrameRef.current);
			animationFrameRef.current = null;
		}
		lastTickRef.current = 0;
		setPlayback((current) => stepReplayForward(actions, current, totalTime));
	}, [actions, totalTime]);

	const stepBack = useCallback(() => {
		if (animationFrameRef.current !== null) {
			cancelAnimationFrame(animationFrameRef.current);
			animationFrameRef.current = null;
		}
		lastTickRef.current = 0;
		setPlayback((current) => stepReplayBack(actions, current));
	}, [actions]);

	if (!state || !state.initial || !state.solution) {
		return (
			<Layout>
				<div className="flex flex-col items-center justify-center min-h-screen">
					<p className="text-foreground mb-4">No game data found.</p>
					<button
						type="button"
						onClick={() => navigate("/statistics")}
						className="px-4 py-2 bg-primary rounded-lg text-white"
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
			headerClassName="justify-between relative z-50"
			headerCenter={<Timer time={playback.time} />}
			headerRight={
				<GameMenu
					difficulty={state.difficulty}
					score={state.score}
					techniques={state.techniques}
					initialBoard={initialBoard}
					techniqueAnalysis={state.techniqueAnalysis}
				/>
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
							aria-label="Previous move"
							className="p-3 text-muted-foreground hover:text-primary transition-colors"
						>
							<SkipBack size={28} />
						</button>

						<button
							type="button"
							onClick={() =>
								setPlayback((current) =>
									toggleReplayPlayback(actions, current, totalTime),
								)
							}
							aria-label={playback.isPlaying ? "Pause replay" : "Play replay"}
							className="w-16 h-16 flex items-center justify-center bg-primary rounded-full text-white shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-all"
						>
							{playback.isPlaying ? (
								<Pause size={32} fill="currentColor" />
							) : (
								<Play size={32} fill="currentColor" className="ml-1" />
							)}
						</button>

						<button
							type="button"
							onClick={stepForward}
							aria-label="Next move"
							className="p-3 text-muted-foreground hover:text-primary transition-colors"
						>
							<SkipForward size={28} />
						</button>
					</div>

					<div className="w-full max-w-md px-4 flex flex-col gap-2">
						<div className="flex justify-between items-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
							<span className="w-16 flex justify-start">{formatTime(0)}</span>
							<span className="flex-1 flex justify-center whitespace-nowrap px-2 tabular-nums">
								{playback.actionIndex} / {actions.length} moves
							</span>
							<span className="w-16 flex justify-end">
								{formatTime(totalTime)}
							</span>
						</div>
						<input
							type="range"
							min="0"
							max={totalTime * 100}
							value={Math.floor(playback.time * 100)}
							onChange={(e) =>
								setPlayback((current) =>
									seekReplayPlayback(
										actions,
										current,
										parseInt(e.target.value, 10) / 100,
										totalTime,
									),
								)
							}
							className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
						/>
					</div>

					{/* Speed Controls */}
					<div className="flex items-center gap-2 bg-secondary p-1 rounded-xl border border-border">
						{[1, 2, 4, 8, 16, 32].map((speed) => (
							<button
								key={speed}
								type="button"
								onClick={() => setSpeedMultiplier(speed)}
								className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
									speedMultiplier === speed
										? "bg-primary text-white"
										: "text-muted-foreground hover:text-primary hover:bg-primary/10"
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
