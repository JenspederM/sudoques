import { describe, expect, test } from "bun:test";
import { installBoardGestureSuppression } from "./boardGestureSuppression";

type Listener = {
	type: string;
	listener: EventListener;
	options?: AddEventListenerOptions | boolean;
};

class FakeSurface {
	listeners: Listener[] = [];
	removed: Array<{ type: string; listener: EventListener }> = [];

	addEventListener(
		type: string,
		listener: EventListener,
		options?: AddEventListenerOptions | boolean,
	) {
		this.listeners.push({ type, listener, options });
	}

	removeEventListener(type: string, listener: EventListener) {
		this.removed.push({ type, listener });
	}
}

describe("board gesture suppression", () => {
	test("installs non-passive touch guards plus selection guards", () => {
		const surface = new FakeSurface();
		installBoardGestureSuppression(surface as unknown as HTMLElement);

		expect(surface.listeners.map(({ type }) => type)).toEqual([
			"touchstart",
			"touchmove",
			"selectstart",
			"dragstart",
		]);
		for (const type of ["touchstart", "touchmove"]) {
			expect(
				surface.listeners.find((listener) => listener.type === type)?.options,
			).toEqual({ passive: false });
		}
	});

	test("prevents cancelable defaults and removes every listener on cleanup", () => {
		const surface = new FakeSurface();
		const cleanup = installBoardGestureSuppression(
			surface as unknown as HTMLElement,
		);
		let prevented = 0;
		const event = {
			cancelable: true,
			preventDefault: () => {
				prevented += 1;
			},
		} as Event;

		for (const { listener } of surface.listeners) listener(event);
		expect(prevented).toBe(4);

		cleanup();
		expect(surface.removed.map(({ type }) => type)).toEqual([
			"touchstart",
			"touchmove",
			"selectstart",
			"dragstart",
		]);
		for (const removed of surface.removed) {
			expect(
				surface.listeners.some(
					(added) =>
						added.type === removed.type && added.listener === removed.listener,
				),
			).toBe(true);
		}
	});
});
