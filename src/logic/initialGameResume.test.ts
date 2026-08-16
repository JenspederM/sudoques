import { describe, expect, test } from "bun:test";
import type { Board, GameState } from "@/types";
import {
	decideInitialGameResume,
	getSavedGameHydrationStatus,
	type SavedGameHydrationStatus,
} from "./initialGameResume";

const solution: Board = [
	[5, 3, 4, 6, 7, 8, 9, 1, 2],
	[6, 7, 2, 1, 9, 5, 3, 4, 8],
	[1, 9, 8, 3, 4, 2, 5, 6, 7],
	[8, 5, 9, 7, 6, 1, 4, 2, 3],
	[4, 2, 6, 8, 5, 3, 7, 9, 1],
	[7, 1, 3, 9, 2, 4, 8, 5, 6],
	[9, 6, 1, 5, 3, 7, 2, 8, 4],
	[2, 8, 7, 4, 1, 9, 6, 3, 5],
	[3, 4, 5, 2, 8, 6, 1, 7, 9],
];

function savedGame(current: Board): Omit<GameState, "lastUpdated"> {
	return {
		puzzle: {
			id: "resume-test",
			initial: solution.map((row) => row.map(() => null)),
			solution,
			difficulty: "easy",
			score: 0,
			techniques: [],
		},
		current,
		notes: Array.from({ length: 9 }, () =>
			Array.from({ length: 9 }, () => new Set<number>()),
		),
		timer: 42,
		actions: [],
	};
}

describe("getSavedGameHydrationStatus", () => {
	test("reports loading before interpreting an initial snapshot", () => {
		expect(getSavedGameHydrationStatus(savedGame(solution), true, false)).toBe(
			"loading",
		);
	});

	test("distinguishes no game, an unfinished game, and a completed game", () => {
		const incomplete = solution.map((row) => [...row]);
		const firstRow = incomplete[0];
		if (!firstRow) throw new Error("Expected a 9x9 solution");
		firstRow[0] = null;

		expect(getSavedGameHydrationStatus(null, false, true)).toBe("none");
		expect(
			getSavedGameHydrationStatus(savedGame(incomplete), false, true),
		).toBe("unfinished");
		expect(getSavedGameHydrationStatus(savedGame(solution), false, true)).toBe(
			"completed",
		);
	});

	test("keeps an empty cache snapshot provisional until the server responds", () => {
		expect(getSavedGameHydrationStatus(null, false, false)).toBe("provisional");
		expect(getSavedGameHydrationStatus(null, false, true)).toBe("none");
	});

	test("resumes a cached unfinished game without waiting for the network", () => {
		const incomplete = solution.map((row) => [...row]);
		const firstRow = incomplete[0];
		if (!firstRow) throw new Error("Expected a 9x9 solution");
		firstRow[0] = null;

		expect(
			getSavedGameHydrationStatus(savedGame(incomplete), false, false),
		).toBe("unfinished");
	});

	test("does not settle from a cached completed game", () => {
		expect(getSavedGameHydrationStatus(savedGame(solution), false, false)).toBe(
			"provisional",
		);
	});
});

describe("decideInitialGameResume", () => {
	const decide = (
		gameStatus: SavedGameHydrationStatus,
		overrides: Partial<Parameters<typeof decideInitialGameResume>[0]> = {},
	) =>
		decideInitialGameResume({
			initialPathname: "/",
			currentPathname: "/",
			hasHandledInitialResume: false,
			authStatus: "authenticated",
			gameStatus,
			...overrides,
		});

	test("waits for authentication before deciding from the game snapshot", () => {
		expect(decide("unfinished", { authStatus: "loading" })).toBe("wait");
	});

	test("does not wait for game data when boot resolves unauthenticated", () => {
		expect(decide("loading", { authStatus: "unauthenticated" })).toBe("stay");
	});

	test("waits for the saved-game snapshot after authentication", () => {
		expect(decide("loading")).toBe("wait");
	});

	test("keeps listening after a non-authoritative cache miss", () => {
		expect(decide("provisional")).toBe("wait");
		expect(decide("unfinished")).toBe("resume");
	});

	test("resumes an unfinished game from an initial Home launch", () => {
		expect(decide("unfinished")).toBe("resume");
	});

	test.each([
		["no saved game", "none"],
		["a completed saved game", "completed"],
	] as const)("stays on Home for %s", (_label, gameStatus) => {
		expect(decide(gameStatus)).toBe("stay");
	});

	test.each([
		"/game",
		"/new-game",
		"/settings",
		"/statistics",
		"/login",
	])("never overrides a direct deep link to %s", (initialPathname) => {
		expect(
			decide("unfinished", {
				initialPathname,
				currentPathname: initialPathname,
			}),
		).toBe("stay");
	});

	test("does not override navigation away from Home while hydration is pending", () => {
		expect(decide("unfinished", { currentPathname: "/settings" })).toBe("stay");
	});

	test("stays on Home after the launch decision has already been handled", () => {
		expect(
			decide("unfinished", {
				hasHandledInitialResume: true,
			}),
		).toBe("stay");
	});
});
