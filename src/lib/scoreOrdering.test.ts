import { describe, expect, test } from "bun:test";
import { sortScoresNewestFirst } from "./scoreOrdering";

const score = (id: string, milliseconds: number) => ({
	id,
	date: { toMillis: () => milliseconds },
});

describe("sortScoresNewestFirst", () => {
	test("orders mixed dates and times from newest to oldest", () => {
		const oldest = score("oldest", new Date("2026-08-18T22:30:00Z").getTime());
		const newest = score("newest", new Date("2026-08-20T08:15:00Z").getTime());
		const middle = score("middle", new Date("2026-08-19T23:59:00Z").getTime());
		const earlierSameDay = score(
			"earlier-same-day",
			new Date("2026-08-20T07:45:00Z").getTime(),
		);

		expect(
			sortScoresNewestFirst([oldest, newest, middle, earlierSameDay]).map(
				(item) => item.id,
			),
		).toEqual(["newest", "earlier-same-day", "middle", "oldest"]);
	});

	test("does not mutate the score array supplied by context", () => {
		const oldest = score("oldest", 1);
		const newest = score("newest", 2);
		const contextScores = [oldest, newest];

		const sorted = sortScoresNewestFirst(contextScores);

		expect(sorted).not.toBe(contextScores);
		expect(contextScores.map((item) => item.id)).toEqual(["oldest", "newest"]);
		expect(sorted.map((item) => item.id)).toEqual(["newest", "oldest"]);
	});
});
