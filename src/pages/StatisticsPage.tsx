import { Timer, Trophy } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MotionCard } from "@/components/MotionCard";
import { buildReviewState, formatTime } from "@/lib/utils";
import type { Difficulty, HighScore } from "@/types";
import { Layout } from "../components/Layout";
import { DIFFICULTIES } from "../logic/constants";

interface StatisticsPageProps {
	scores: HighScore[];
}

export const StatisticsPage: React.FC<StatisticsPageProps> = ({
	scores: allScores,
}) => {
	const navigate = useNavigate();
	const location = useLocation();
	const initialDiff =
		(location.state as { activeDiff?: Difficulty })?.activeDiff || "easy";
	const [activeDiff, setActiveDiff] = useState<Difficulty>(initialDiff);

	const scores = allScores
		.filter((s) => s.puzzle.difficulty === activeDiff)
		.sort((a, b) => a.time - b.time);

	return (
		<Layout
			backRedirect="/"
			headerCenter={
				<h2 className="text-2xl font-black tracking-tight text-text-primary">
					Statistics
				</h2>
			}
		>
			{/* Tabs */}
			<MotionCard className="grid grid-cols-3 gap-2">
				{DIFFICULTIES.map((d) => (
					<button
						key={d.id}
						type="button"
						onClick={() => setActiveDiff(d.id)}
						className={`py-2 rounded-xl text-sm font-bold transition-all ${
							activeDiff === d.id
								? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20"
								: "text-text-secondary hover:text-brand-primary hover:bg-brand-primary/10"
						}`}
					>
						{d.label}
					</button>
				))}
			</MotionCard>

			{/* Score List */}
			<div className="w-full h-full overflow-y-auto space-y-3 pr-1 custom-scrollbar min-h-0">
				{scores.length > 0 ? (
					scores.map((score, idx) => (
						<MotionCard
							key={score.date.toMillis()}
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: idx * 0.05 }}
							onClick={() => {
								navigate("/review", {
									state: buildReviewState({
										initial: score.puzzle.initial,
										solution: score.puzzle.solution,
										time: score.time,
										difficulty: score.puzzle.difficulty,
										actions: score.actions ?? [],
										score: score.puzzle.score,
										techniques: score.puzzle.techniques,
									}),
								});
							}}
							className="flex items-center justify-between p-5 rounded-[1.5rem] bg-surface-input border border-border-subtle transition-colors cursor-pointer hover:bg-surface-hover"
						>
							<div className="flex items-center gap-4">
								<span
									className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${
										idx === 0
											? "bg-yellow-400 text-slate-900 shadow-lg shadow-yellow-400/20"
											: idx === 1
												? "bg-slate-300 text-slate-900 shadow-lg shadow-slate-300/20"
												: idx === 2
													? "bg-amber-600 text-white shadow-lg shadow-amber-600/20"
													: "bg-surface-hover text-text-secondary"
									}`}
								>
									{idx + 1}
								</span>
								<div>
									<p className="font-bold text-text-primary text-lg">
										{score.date.toDate().toLocaleDateString(undefined, {
											month: "short",
											day: "numeric",
											year: "numeric",
										})}
									</p>
									<p className="text-xs text-text-muted font-medium tracking-wide uppercase">
										{score.date.toDate().toLocaleTimeString(undefined, {
											hour: "numeric",
											minute: "2-digit",
										})}
									</p>
								</div>
							</div>
							<div className="flex items-center gap-2 text-brand-primary font-mono text-xl font-black">
								<Timer size={18} className="translate-y-[1px]" />
								<span>{formatTime(score.time)}</span>
							</div>
						</MotionCard>
					))
				) : (
					<MotionCard className="text-center py-16">
						<Trophy
							size={48}
							className="text-text-muted mx-auto mb-4 opacity-20"
						/>
						<p className="text-text-secondary font-bold text-lg">
							No scores yet
						</p>
						<p className="text-sm text-text-muted">
							Be the first to claim victory!
						</p>
					</MotionCard>
				)}
			</div>
		</Layout>
	);
};
