import { describe, expect, test } from "bun:test";
import {
	createScreenWakeLockController,
	type ScreenWakeLockSentinel,
} from "./screenWakeLock";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const createSentinel = () => {
	let releaseListener: (() => void) | null = null;
	let releaseCalls = 0;
	const sentinel: ScreenWakeLockSentinel = {
		released: false,
		async release() {
			releaseCalls += 1;
			sentinel.released = true;
			releaseListener?.();
		},
		addEventListener(_type, listener) {
			releaseListener = listener;
		},
		removeEventListener(_type, listener) {
			if (releaseListener === listener) releaseListener = null;
		},
	};

	return { sentinel, getReleaseCalls: () => releaseCalls };
};

const createHarness = (request?: () => Promise<ScreenWakeLockSentinel>) => {
	let visible = true;
	let visibilityListener: (() => void) | null = null;
	const controller = createScreenWakeLockController({
		request,
		isVisible: () => visible,
		addVisibilityListener: (listener) => {
			visibilityListener = listener;
		},
		removeVisibilityListener: (listener) => {
			if (visibilityListener === listener) visibilityListener = null;
		},
	});

	return {
		controller,
		setVisible(nextVisible: boolean) {
			visible = nextVisible;
			visibilityListener?.();
		},
		hasVisibilityListener: () => visibilityListener !== null,
	};
};

describe("screen wake lock controller", () => {
	test("is a safe no-op when the API is unavailable", async () => {
		const harness = createHarness();

		harness.controller.start();
		await flush();
		expect(harness.hasVisibilityListener()).toBe(true);

		harness.controller.stop();
		expect(harness.hasVisibilityListener()).toBe(false);
	});

	test("acquires while visible and releases when stopped", async () => {
		const lock = createSentinel();
		let requestCalls = 0;
		const harness = createHarness(async () => {
			requestCalls += 1;
			return lock.sentinel;
		});

		harness.controller.start();
		await flush();
		expect(requestCalls).toBe(1);

		harness.controller.stop();
		await flush();
		expect(lock.getReleaseCalls()).toBe(1);
	});

	test("releases while hidden and reacquires when visible again", async () => {
		const locks = [createSentinel(), createSentinel()];
		let requestCalls = 0;
		const harness = createHarness(async () => {
			const nextLock = locks[requestCalls];
			requestCalls += 1;
			if (!nextLock) throw new Error("Unexpected wake lock request");
			return nextLock.sentinel;
		});

		harness.controller.start();
		await flush();
		harness.setVisible(false);
		await flush();
		expect(locks[0]?.getReleaseCalls()).toBe(1);

		harness.setVisible(true);
		await flush();
		expect(requestCalls).toBe(2);
		harness.controller.stop();
	});

	test("can retry after the browser denies a request", async () => {
		const lock = createSentinel();
		let requestCalls = 0;
		const harness = createHarness(async () => {
			requestCalls += 1;
			if (requestCalls === 1) throw new Error("Not allowed");
			return lock.sentinel;
		});

		harness.controller.start();
		await flush();
		harness.setVisible(false);
		harness.setVisible(true);
		await flush();

		expect(requestCalls).toBe(2);
		harness.controller.stop();
	});

	test("releases a pending acquisition that resolves after stop", async () => {
		const lock = createSentinel();
		let resolveRequest: ((sentinel: ScreenWakeLockSentinel) => void) | null =
			null;
		const request = new Promise<ScreenWakeLockSentinel>((resolve) => {
			resolveRequest = resolve;
		});
		const harness = createHarness(() => request);

		harness.controller.start();
		harness.controller.stop();
		resolveRequest?.(lock.sentinel);
		await flush();

		expect(lock.getReleaseCalls()).toBe(1);
	});

	test("releases a pending acquisition that resolves while hidden, then reacquires", async () => {
		const firstLock = createSentinel();
		const secondLock = createSentinel();
		const resolvers: Array<(sentinel: ScreenWakeLockSentinel) => void> = [];
		let requestCalls = 0;
		const harness = createHarness(
			() =>
				new Promise<ScreenWakeLockSentinel>((resolve) => {
					requestCalls += 1;
					resolvers.push(resolve);
				}),
		);

		harness.controller.start();
		harness.setVisible(false);
		resolvers[0]?.(firstLock.sentinel);
		await flush();

		expect(firstLock.getReleaseCalls()).toBe(1);
		expect(requestCalls).toBe(1);

		harness.setVisible(true);
		expect(requestCalls).toBe(2);
		resolvers[1]?.(secondLock.sentinel);
		await flush();

		harness.controller.stop();
		await flush();
		expect(secondLock.getReleaseCalls()).toBe(1);
	});

	test("does not request a lock until an initially hidden page becomes visible", async () => {
		const lock = createSentinel();
		let requestCalls = 0;
		const harness = createHarness(async () => {
			requestCalls += 1;
			return lock.sentinel;
		});

		harness.setVisible(false);
		harness.controller.start();
		await flush();
		expect(requestCalls).toBe(0);

		harness.setVisible(true);
		await flush();
		expect(requestCalls).toBe(1);
		harness.controller.stop();
	});
});
