import { Trophy } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { PageTitle } from "@/components/PageTitle";
import {
	StaggeredList,
	StaggeredListElement,
} from "@/components/StaggeredList";
import { Timer } from "@/components/Timer";
import { buildReviewState } from "@/lib/utils";
import type { Difficulty, HighScore } from "@/types";
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
			headerCenter={<PageTitle title="Statistics" />}
			headerClassName="mb-4"
		>
			{/* Tabs */}
			<StaggeredList className="bg-glass py-4 px-6 grid grid-cols-3 gap-2 mb-6 rounded-xl border border-border">
				{DIFFICULTIES.map((d) => (
					<StaggeredListElement
						key={d.id}
						type="button"
						variant={activeDiff === d.id ? "brand" : "transparent"}
						className="border-none py-2 text-sm rounded-lg"
						whileTap={{ scale: 0.95 }}
						onClick={() => setActiveDiff(d.id)}
					>
						{d.label}
					</StaggeredListElement>
				))}
			</StaggeredList>

			{/* Score List */}
			<StaggeredList className="overflow-auto h-full">
				{scores.length > 0 ? (
					scores.map((score, idx) => (
						<StaggeredListElement
							key={score.date.toMillis()}
							type="button"
							whileHover={{ scale: 1 }}
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
							className="flex items-center justify-between"
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
													: "bg-accent text-muted-foreground"
									}`}
								>
									{idx + 1}
								</span>
								<div>
									<p className="font-bold text-foreground text-lg">
										{score.date.toDate().toLocaleDateString(undefined, {
											month: "short",
											day: "numeric",
											year: "numeric",
										})}
									</p>
									<p className="text-xs text-muted-foreground font-medium tracking-wide uppercase">
										{score.date.toDate().toLocaleTimeString(undefined, {
											hour: "numeric",
											minute: "2-digit",
										})}
									</p>
								</div>
							</div>
							<Timer time={score.time} />
						</StaggeredListElement>
					))
				) : (
					<StaggeredListElement className="text-center">
						<Trophy
							size={48}
							className="text-muted-foreground mx-auto mb-4 opacity-20"
						/>
						<p className="text-muted-foreground font-bold text-lg">
							No scores yet
						</p>
						<p className="text-sm text-muted-foreground">
							Be the first to claim victory!
						</p>
					</StaggeredListElement>
				)}
			</StaggeredList>
		</Layout>
	);
};
