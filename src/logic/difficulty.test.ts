import { describe, expect, test } from "bun:test";
import type { Difficulty, Technique } from "@/types";
import { classifyDifficulty } from "./difficulty";
import { gradePuzzle } from "./solver";
import { parsePuzzle } from "./sudoku";

describe("classifyDifficulty", () => {
	test.each([
		["Naked Single", "easy"],
		["Hidden Single", "normal"],
		["Naked Pair", "medium"],
		["Pointing Pairs", "medium"],
		["Naked Triple", "hard"],
		["X-Wing", "hard"],
		["Skyscraper", "hard"],
		["2-String Kite", "hard"],
		["Y-Wing", "expert"],
		["Swordfish", "expert"],
		["XY-Chain", "master"],
		["Backtracking", "master"],
	] satisfies Array<
		[Technique, Difficulty]
	>)("classifies %s as %s", (technique, expected) => {
		expect(classifyDifficulty(new Set([technique]))).toBe(expected);
	});

	test("uses the most advanced technique in a solve", () => {
		const techniques = new Set<Technique>([
			"Naked Single",
			"Hidden Single",
			"Pointing Pairs",
		]);

		expect(classifyDifficulty(techniques)).toBe("medium");
	});

	test("never places a backtracking solve below master", () => {
		const techniques = new Set<Technique>(["Naked Single", "Backtracking"]);

		expect(classifyDifficulty(techniques)).toBe("master");
	});

	test("moves a singles-only puzzle out of the old medium score band", () => {
		const graded = gradePuzzle(
			parsePuzzle(
				"000823001003000400070000052300960010000102000010038006830000040002000900600789000",
			),
		);

		expect(graded.difficulty).toBeGreaterThanOrEqual(4);
		expect(graded.difficulty).toBeLessThan(5);
		expect(classifyDifficulty(graded.techniquesUsed)).toBe("normal");
	});

	test("moves a backtracking puzzle out of the old medium score band", () => {
		const graded = gradePuzzle(
			parsePuzzle(
				"000000000706308905004675800097030650058902710000000000009000100000103000010060080",
			),
		);

		expect(graded.difficulty).toBeGreaterThanOrEqual(4);
		expect(graded.difficulty).toBeLessThan(5);
		expect(graded.techniquesUsed.has("Backtracking")).toBe(true);
		expect(classifyDifficulty(graded.techniquesUsed)).toBe("master");
	});
});
