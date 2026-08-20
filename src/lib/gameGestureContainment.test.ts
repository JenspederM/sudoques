import { describe, expect, test } from "bun:test";
import {
	acquireGameGestureContainment,
	GAME_ROUTE_ACTIVE_CLASS,
	type GameGestureDocument,
} from "./gameGestureContainment";

function createClassList(initial: string[] = []) {
	const values = new Set(initial);
	return {
		add(...tokens: string[]) {
			for (const token of tokens) values.add(token);
		},
		contains(token: string) {
			return values.has(token);
		},
		remove(...tokens: string[]) {
			for (const token of tokens) values.delete(token);
		},
	};
}

function createDocument(initial: { html?: string[]; body?: string[] } = {}) {
	return {
		documentElement: { classList: createClassList(initial.html) },
		body: { classList: createClassList(initial.body) },
	} satisfies GameGestureDocument;
}

describe("game gesture containment", () => {
	test("adds the route class to html and body and removes it on release", () => {
		const target = createDocument();
		const release = acquireGameGestureContainment(target);

		expect(
			target.documentElement.classList.contains(GAME_ROUTE_ACTIVE_CLASS),
		).toBe(true);
		expect(target.body.classList.contains(GAME_ROUTE_ACTIVE_CLASS)).toBe(true);

		release();

		expect(
			target.documentElement.classList.contains(GAME_ROUTE_ACTIVE_CLASS),
		).toBe(false);
		expect(target.body.classList.contains(GAME_ROUTE_ACTIVE_CLASS)).toBe(false);
	});

	test("keeps containment active until every caller has released it", () => {
		const target = createDocument();
		const releaseFirst = acquireGameGestureContainment(target);
		const releaseSecond = acquireGameGestureContainment(target);

		releaseFirst();
		releaseFirst();
		expect(target.body.classList.contains(GAME_ROUTE_ACTIVE_CLASS)).toBe(true);

		releaseSecond();
		expect(target.body.classList.contains(GAME_ROUTE_ACTIVE_CLASS)).toBe(false);
	});

	test("preserves route classes that existed before acquisition", () => {
		const target = createDocument({
			html: [GAME_ROUTE_ACTIVE_CLASS],
			body: [GAME_ROUTE_ACTIVE_CLASS],
		});

		acquireGameGestureContainment(target)();

		expect(
			target.documentElement.classList.contains(GAME_ROUTE_ACTIVE_CLASS),
		).toBe(true);
		expect(target.body.classList.contains(GAME_ROUTE_ACTIVE_CLASS)).toBe(true);
	});
});
