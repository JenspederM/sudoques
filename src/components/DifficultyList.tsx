import {
	CircleAlert,
	CircleCheck,
	LoaderCircle,
	Play,
	Trophy,
} from "lucide-react";
import { useMemo } from "react";
import {
	StaggeredList,
	StaggeredListElement,
} from "@/components/StaggeredList";
import { getDifficultyStats } from "@/lib/difficultyStats";
import { formatTime } from "@/lib/utils";
import { DIFFICULTIES } from "@/logic/constants";
import type { Difficulty, HighScore } from "@/types";

type DifficultyListProps = {
	scores: readonly HighScore[];
	isLoading: boolean;
	isUnavailable: boolean;
	onSelectDifficulty: (difficulty: Difficulty) => void;
};

export function DifficultyList({
	scores,
	isLoading,
	isUnavailable,
	onSelectDifficulty,
}: DifficultyListProps) {
	const stats = useMemo(() => getDifficultyStats(scores), [scores]);

	return (
		<StaggeredList
			className="h-full min-w-0 gap-2.5 overflow-x-hidden overflow-y-auto sm:gap-4 sm:overflow-visible"
			data-testid="difficulty-list"
		>
			{DIFFICULTIES.map((difficulty) => {
				const difficultyStats = stats[difficulty.id];
				const bestTime =
					difficultyStats.bestTime === null
						? "No record yet"
						: formatTime(difficultyStats.bestTime);

				return (
					<StaggeredListElement
						key={difficulty.id}
						onClick={() => onSelectDifficulty(difficulty.id)}
						type="button"
						className="min-w-0 max-w-full justify-between gap-3 px-4 py-3 text-left sm:gap-4 sm:px-6 sm:py-4"
						data-testid={`diff-${difficulty.id}`}
						aria-label={
							isUnavailable
								? `Start ${difficulty.label} game. Personal records are unavailable.`
								: isLoading
									? `Start ${difficulty.label} game. Records are loading.`
									: `Start ${difficulty.label} game. Personal best: ${bestTime}. Completed games: ${difficultyStats.completedGames}.`
						}
						whileHover={{
							scale: 1,
							borderColor: "var(--primary)",
							color: "var(--primary)",
							backgroundColor: "var(--primary/10)",
						}}
					>
						<div className="min-w-0 flex-1">
							<h3>{difficulty.label}</h3>
							<p className="truncate text-xs font-medium tracking-wide text-muted-foreground">
								{difficulty.desc}
							</p>
							{isUnavailable ? (
								<output
									className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-amber-500 sm:mt-2"
									data-testid={`diff-${difficulty.id}-records-unavailable`}
								>
									<CircleAlert size={14} aria-hidden="true" />
									Records unavailable
								</output>
							) : isLoading ? (
								<output
									className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground sm:mt-2"
									data-testid={`diff-${difficulty.id}-records-loading`}
								>
									<LoaderCircle
										size={14}
										className="animate-spin"
										aria-hidden="true"
									/>
									Loading records…
								</output>
							) : (
								<div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-muted-foreground sm:mt-2">
									<span
										className="flex items-center gap-1"
										data-testid={`diff-${difficulty.id}-best-time`}
									>
										<Trophy size={14} aria-hidden="true" />
										<span>
											Best{" "}
											<strong className="font-mono text-foreground">
												{bestTime}
											</strong>
										</span>
									</span>
									<span
										className="flex items-center gap-1"
										data-testid={`diff-${difficulty.id}-completed-games`}
									>
										<CircleCheck size={14} aria-hidden="true" />
										<span>
											<strong className="text-foreground">
												{difficultyStats.completedGames}
											</strong>{" "}
											{difficultyStats.completedGames === 1 ? "game" : "games"}
										</span>
									</span>
								</div>
							)}
						</div>
						<div className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary sm:size-12 sm:rounded-2xl">
							<Play size={20} fill="currentColor" aria-hidden="true" />
						</div>
					</StaggeredListElement>
				);
			})}
		</StaggeredList>
	);
}
