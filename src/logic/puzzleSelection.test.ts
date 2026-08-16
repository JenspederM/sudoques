import { describe, expect, test } from "bun:test";
import {
	createPuzzleCursor,
	isPuzzleHistoryHydrated,
	mergePuzzleCandidates,
	pickPuzzleAfterHistoryIsExhausted,
	pickPuzzleFromCatalog,
	pickUnseenPuzzle,
	syncPuzzleHistorySession,
} from "./puzzleSelection";

const candidates = Array.from({ length: 10 }, (_, index) => ({
	id: `puzzle-${index}`,
}));

describe("puzzle selection", () => {
	test("creates a cursor spanning the full 12-character puzzle ID range", () => {
		expect(createPuzzleCursor(() => 0)).toBe("000000000000");
		expect(createPuzzleCursor(() => 1)).toBe("ffffffffffff");
	});

	test("merges both sides of a wrapped query without duplicate documents", () => {
		expect(
			mergePuzzleCandidates(candidates.slice(7), candidates.slice(0, 8)).map(
				(candidate) => candidate.id,
			),
		).toEqual([
			"puzzle-7",
			"puzzle-8",
			"puzzle-9",
			"puzzle-0",
			"puzzle-1",
			"puzzle-2",
			"puzzle-3",
			"puzzle-4",
			"puzzle-5",
			"puzzle-6",
		]);
	});

	test("offers every local puzzle before repeating one", () => {
		const seen = new Set<string>();
		const offered: string[] = [];

		for (let index = 0; index < candidates.length; index++) {
			const selected = pickUnseenPuzzle(candidates, seen, () => 0);
			expect(selected).not.toBeNull();
			if (selected) {
				offered.push(selected.id);
				seen.add(selected.id);
			}
		}

		expect(new Set(offered).size).toBe(10);
		expect(pickUnseenPuzzle(candidates, seen, () => 0)).toBeNull();
	});

	test("does not immediately repeat the current puzzle after exhausting history", () => {
		expect(
			pickPuzzleAfterHistoryIsExhausted(candidates, "puzzle-0", () => 0)?.id,
		).toBe("puzzle-1");
	});

	test("can reuse the current puzzle only when it is the sole option", () => {
		expect(
			pickPuzzleAfterHistoryIsExhausted(
				[{ id: "only-puzzle" }],
				"only-puzzle",
				() => 0,
			)?.id,
		).toBe("only-puzzle");
	});

	test("keeps session history for the same account and resets it on UID change", () => {
		const firstUser = syncPuzzleHistorySession(
			{ userId: null, puzzleIds: new Set(["anonymous-old"]) },
			"user-a",
			["server-a"],
		);
		firstUser.puzzleIds.add("session-a");

		expect(
			syncPuzzleHistorySession(firstUser, "user-a", ["server-a-2"]).puzzleIds,
		).toEqual(new Set(["server-a", "session-a", "server-a-2"]));
		expect(syncPuzzleHistorySession(firstUser, "user-b", ["server-b"])).toEqual(
			{ userId: "user-b", puzzleIds: new Set(["server-b"]) },
		);
	});

	test("only considers the active account's puzzle history hydrated", () => {
		expect(isPuzzleHistoryHydrated("user-a", "user-a", true)).toBe(true);
		expect(isPuzzleHistoryHydrated("user-b", "user-a", true)).toBe(false);
		expect(isPuzzleHistoryHydrated("user-a", "user-a", false)).toBe(false);
		expect(isPuzzleHistoryHydrated(null, "user-a", false)).toBe(true);
	});

	test("uses an unseen catalog puzzle when every random sample was already seen", () => {
		const sampled = candidates.slice(0, 3);
		const catalog = [...sampled, candidates[3]];
		const selection = pickPuzzleFromCatalog(
			sampled,
			catalog,
			new Set(sampled.map(({ id }) => id)),
			"puzzle-0",
			() => 0,
		);

		expect(selection).toEqual({
			candidate: candidates[3],
			reused: false,
		});
	});

	test("only reuses a non-current puzzle after the bounded catalog is exhausted", () => {
		const selection = pickPuzzleFromCatalog(
			candidates.slice(0, 2),
			candidates,
			new Set(candidates.map(({ id }) => id)),
			"puzzle-0",
			() => 0,
		);

		expect(selection).toEqual({
			candidate: candidates[1],
			reused: true,
		});
	});
});
