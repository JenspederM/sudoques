import { describe, expect, test } from "bun:test";
import { createPressAndHoldController } from "./pressAndHold";

const createScheduler = () => {
	let pending: (() => void) | null = null;
	return {
		schedule(callback: () => void) {
			pending = callback;
			return () => {
				pending = null;
			};
		},
		fire() {
			const callback = pending;
			pending = null;
			callback?.();
		},
	};
};

describe("createPressAndHoldController", () => {
	test("a completed hold fires once and consumes the following click", () => {
		const scheduler = createScheduler();
		const controller = createPressAndHoldController({
			schedule: scheduler.schedule,
		});
		let holds = 0;

		controller.start({ x: 0, y: 0 }, () => holds++);
		scheduler.fire();
		controller.end();

		expect(holds).toBe(1);
		expect(controller.consumeClick()).toBe(true);
		expect(controller.consumeClick()).toBe(false);
	});

	test("ending a short press leaves the normal click available", () => {
		const scheduler = createScheduler();
		const controller = createPressAndHoldController({
			schedule: scheduler.schedule,
		});
		let holds = 0;

		controller.start({ x: 0, y: 0 }, () => holds++);
		controller.end();
		scheduler.fire();

		expect(holds).toBe(0);
		expect(controller.consumeClick()).toBe(false);
	});

	test("moving beyond the threshold cancels the hold", () => {
		const scheduler = createScheduler();
		const controller = createPressAndHoldController({
			maxMovement: 12,
			schedule: scheduler.schedule,
		});
		let holds = 0;

		controller.start({ x: 0, y: 0 }, () => holds++);
		controller.move({ x: 13, y: 0 });
		scheduler.fire();

		expect(holds).toBe(0);
		expect(controller.consumeClick()).toBe(false);
	});
});
