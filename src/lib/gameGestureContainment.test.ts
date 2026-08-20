import { describe, expect, test } from "bun:test";
import {
	acquireGameGestureContainment,
	GAME_EDGE_GUARD_PX,
	GAME_ROUTE_ACTIVE_CLASS,
	type GameGestureDocument,
	isGameNavigationEdge,
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
	const listeners = new Map<string, Set<EventListener>>();
	const listenerOptions: Array<{ type: string; options: unknown }> = [];
	const target = {
		documentElement: {
			classList: createClassList(initial.html),
			clientWidth: 375,
		},
		body: { classList: createClassList(initial.body) },
		defaultView: { innerWidth: 375 },
		addEventListener(type: string, listener: EventListener, options?: unknown) {
			listeners.set(type, new Set([...(listeners.get(type) ?? []), listener]));
			listenerOptions.push({ type, options });
		},
		removeEventListener(type: string, listener: EventListener) {
			listeners.get(type)?.delete(listener);
		},
		emit(type: string, event: unknown) {
			for (const listener of listeners.get(type) ?? []) {
				listener(event as Event);
			}
		},
		listenerCount(type: string) {
			return listeners.get(type)?.size ?? 0;
		},
		listenerOptions,
	};
	return target as typeof target & GameGestureDocument;
}

function createTouchEvent(clientX: number) {
	let prevented = 0;
	return {
		touches: [{ clientX }],
		cancelable: true,
		preventDefault() {
			prevented += 1;
		},
		get prevented() {
			return prevented;
		},
	};
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

	test("recognizes only the narrow physical navigation edges", () => {
		expect(isGameNavigationEdge(0, 375)).toBe(true);
		expect(isGameNavigationEdge(GAME_EDGE_GUARD_PX, 375)).toBe(true);
		expect(isGameNavigationEdge(GAME_EDGE_GUARD_PX + 1, 375)).toBe(false);
		expect(isGameNavigationEdge(375 - GAME_EDGE_GUARD_PX, 375)).toBe(true);
		expect(isGameNavigationEdge(187, 375)).toBe(false);
	});

	test("actively cancels edge-originating iOS touch sequences only", () => {
		const target = createDocument();
		const release = acquireGameGestureContainment(target);
		const edgeStart = createTouchEvent(8);
		const edgeMove = createTouchEvent(80);

		target.emit("touchstart", edgeStart);
		target.emit("touchmove", edgeMove);
		expect(edgeStart.prevented).toBe(1);
		expect(edgeMove.prevented).toBe(1);

		target.emit("touchend", createTouchEvent(80));
		const centerStart = createTouchEvent(180);
		const centerMove = createTouchEvent(120);
		target.emit("touchstart", centerStart);
		target.emit("touchmove", centerMove);
		expect(centerStart.prevented).toBe(0);
		expect(centerMove.prevented).toBe(0);
		expect(target.listenerOptions).toContainEqual({
			type: "touchstart",
			options: { capture: true, passive: false },
		});

		release();
		expect(target.listenerCount("touchstart")).toBe(0);
		expect(target.listenerCount("touchmove")).toBe(0);
	});

	test("shares one edge guard across strict-mode acquisitions", () => {
		const target = createDocument();
		const releaseFirst = acquireGameGestureContainment(target);
		const releaseSecond = acquireGameGestureContainment(target);
		expect(target.listenerCount("touchstart")).toBe(1);

		releaseFirst();
		expect(target.listenerCount("touchstart")).toBe(1);
		releaseSecond();
		expect(target.listenerCount("touchstart")).toBe(0);
	});
});
