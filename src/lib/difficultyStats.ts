import { DIFFICULTIES } from "@/logic/constants";
import type { Difficulty, HighScore, Puzzle } from "@/types";

export type DifficultyStats = {
	bestTime: number | null;
	completedGames: number;
};

type ScoreForDifficultyStats = Pick<HighScore, "time"> & {
	puzzle: Pick<Puzzle, "difficulty">;
};

export type DifficultyStatsByDifficulty = Record<Difficulty, DifficultyStats>;

/**
 * Summarises completed games without changing or reordering the source scores.
 * Every high-score entry represents one completed game, matching StatisticsPage.
 */
export function getDifficultyStats(
	scores: readonly ScoreForDifficultyStats[],
): DifficultyStatsByDifficulty {
	const stats = Object.fromEntries(
		DIFFICULTIES.map(({ id }) => [id, { bestTime: null, completedGames: 0 }]),
	) as DifficultyStatsByDifficulty;

	for (const score of scores) {
		if (!Object.hasOwn(stats, score.puzzle.difficulty)) continue;

		const difficultyStats = stats[score.puzzle.difficulty];
		difficultyStats.completedGames += 1;

		// A malformed legacy value should not turn the personal best into NaN.
		if (!Number.isFinite(score.time) || score.time < 0) continue;

		difficultyStats.bestTime =
			difficultyStats.bestTime === null
				? score.time
				: Math.min(difficultyStats.bestTime, score.time);
	}

	return stats;
}
