import { describe, expect, test } from "bun:test";
import { DIFFICULTIES } from "@/logic/constants";
import type { Difficulty } from "@/types";
import { getDifficultyStats } from "./difficultyStats";

const completedGame = (difficulty: Difficulty, time: number) => ({
	puzzle: { difficulty },
	time,
});

describe("getDifficultyStats", () => {
	test("returns an explicit empty state for every difficulty", () => {
		const stats = getDifficultyStats([]);

		expect(Object.keys(stats)).toEqual(DIFFICULTIES.map(({ id }) => id));
		for (const { id } of DIFFICULTIES) {
			expect(stats[id]).toEqual({ bestTime: null, completedGames: 0 });
		}
	});

	test("counts every completed game and keeps the fastest time", () => {
		const stats = getDifficultyStats([
			completedGame("easy", 125),
			completedGame("easy", 98.9),
			completedGame("easy", 140),
			completedGame("master", 600),
		]);

		expect(stats.easy).toEqual({ bestTime: 98.9, completedGames: 3 });
		expect(stats.master).toEqual({ bestTime: 600, completedGames: 1 });
		expect(stats.normal).toEqual({ bestTime: null, completedGames: 0 });
	});

	test("does not reorder or mutate the source scores", () => {
		const scores = Object.freeze([
			Object.freeze(completedGame("hard", 300)),
			Object.freeze(completedGame("hard", 180)),
		]);

		getDifficultyStats(scores);

		expect(scores.map(({ time }) => time)).toEqual([300, 180]);
	});

	test("keeps malformed legacy values from producing a misleading record", () => {
		const stats = getDifficultyStats([
			completedGame("normal", Number.NaN),
			completedGame("normal", -1),
			completedGame("normal", 210),
			completedGame("legacy" as Difficulty, 1),
		]);

		expect(stats.normal).toEqual({ bestTime: 210, completedGames: 3 });
		expect(Object.keys(stats)).toEqual(DIFFICULTIES.map(({ id }) => id));
	});
});
