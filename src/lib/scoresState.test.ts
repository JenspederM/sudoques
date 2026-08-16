import { describe, expect, test } from "bun:test";
import { resolveScoresForUser, settleScoresForUser } from "./scoresState";

describe("resolveScoresForUser", () => {
	test("never exposes the previous account's scores while a new UID loads", () => {
		const previousAccount = {
			userId: "user-a",
			scores: [{ id: "score-a" }],
			isLoading: false,
			isUnavailable: false,
		};

		expect(resolveScoresForUser(previousAccount, "user-b")).toEqual({
			scores: [],
			isLoading: true,
			isUnavailable: false,
		});
	});

	test("exposes scores only after the active account snapshot arrives", () => {
		const loading = {
			userId: "user-b",
			scores: [] as { id: string }[],
			isLoading: true,
			isUnavailable: false,
		};
		const loaded = {
			userId: "user-b",
			scores: [{ id: "score-b" }],
			isLoading: false,
			isUnavailable: false,
		};

		expect(resolveScoresForUser(loading, "user-b")).toEqual({
			scores: [],
			isLoading: true,
			isUnavailable: false,
		});
		expect(resolveScoresForUser(loaded, "user-b")).toEqual({
			scores: [{ id: "score-b" }],
			isLoading: false,
			isUnavailable: false,
		});
	});

	test("clears scores and finishes loading when signed out", () => {
		expect(
			resolveScoresForUser(
				{
					userId: "user-a",
					scores: [{ id: "private-score" }],
					isLoading: false,
					isUnavailable: false,
				},
				null,
			),
		).toEqual({ scores: [], isLoading: false, isUnavailable: false });
	});

	test("settles an active listener error as unavailable instead of loading forever", () => {
		const loading = {
			userId: "user-a",
			scores: [] as { id: string }[],
			isLoading: true,
			isUnavailable: false,
		};

		expect(
			settleScoresForUser(loading, "user-a", "user-a", { type: "failed" }),
		).toEqual({
			userId: "user-a",
			scores: [],
			isLoading: false,
			isUnavailable: true,
		});
	});

	test("ignores late success and error callbacks from a previous account", () => {
		const loadingCurrentAccount = {
			userId: "user-b",
			scores: [] as { id: string }[],
			isLoading: true,
			isUnavailable: false,
		};

		expect(
			settleScoresForUser(loadingCurrentAccount, "user-b", "user-a", {
				type: "loaded",
				scores: [{ id: "stale-score" }],
			}),
		).toBe(loadingCurrentAccount);
		expect(
			settleScoresForUser(loadingCurrentAccount, "user-b", "user-a", {
				type: "failed",
			}),
		).toBe(loadingCurrentAccount);
	});

	test("a later successful subscription clears a previous unavailable state", () => {
		const unavailable = {
			userId: "user-a",
			scores: [] as { id: string }[],
			isLoading: false,
			isUnavailable: true,
		};

		expect(
			settleScoresForUser(unavailable, "user-a", "user-a", {
				type: "loaded",
				scores: [{ id: "score-a" }],
			}),
		).toEqual({
			userId: "user-a",
			scores: [{ id: "score-a" }],
			isLoading: false,
			isUnavailable: false,
		});
	});
});
