import { describe, expect, test } from "bun:test";
import {
	createDoubleTapInputController,
	type PendingNumberInput,
} from "./doubleTapInput";

function createHarness() {
	let scheduled: (() => void) | undefined;
	const events: string[] = [];
	const controller = createDoubleTapInputController({
		schedule: (callback) => {
			scheduled = callback;
			return () => {
				scheduled = undefined;
			};
		},
	});
	const callbacks = {
		onPreview: (input: PendingNumberInput) =>
			events.push(`preview:${input.value}`),
		onCommit: (input: PendingNumberInput, reason: "timeout" | "flush") =>
			events.push(`commit:${input.value}:${reason}`),
		onNote: (input: PendingNumberInput) => events.push(`note:${input.value}`),
		onCancel: (input: PendingNumberInput) =>
			events.push(`cancel:${input.value}`),
	};
	return {
		controller,
		callbacks,
		events,
		flush: () => scheduled?.(),
	};
}

describe("double-tap number input", () => {
	test("previews immediately and commits only after the window", () => {
		const { controller, callbacks, events, flush } = createHarness();
		controller.tap({ row: 1, col: 2, value: 4 }, callbacks);

		expect(events).toEqual(["preview:4"]);
		expect(controller.hasPending()).toBe(true);
		flush();
		expect(events).toEqual(["preview:4", "commit:4:timeout"]);
		expect(controller.hasPending()).toBe(false);
	});

	test("a matching second tap becomes a note without committing the value", () => {
		const { controller, callbacks, events, flush } = createHarness();
		const input = { row: 1, col: 2, value: 4 };
		controller.tap(input, callbacks);
		controller.tap(input, callbacks);
		flush();

		expect(events).toEqual(["preview:4", "note:4"]);
		expect(controller.hasPending()).toBe(false);
	});

	test("a different second tap replaces the preview instead of committing it", () => {
		const { controller, callbacks, events, flush } = createHarness();
		controller.tap({ row: 1, col: 2, value: 4 }, callbacks);
		controller.tap({ row: 1, col: 2, value: 7 }, callbacks);
		flush();

		expect(events).toEqual([
			"preview:4",
			"cancel:4",
			"preview:7",
			"commit:7:timeout",
		]);
	});

	test("the same number in a different cell starts a new preview", () => {
		const { controller, callbacks, events, flush } = createHarness();
		controller.tap({ row: 1, col: 2, value: 4 }, callbacks);
		controller.tap({ row: 1, col: 3, value: 4 }, callbacks);
		flush();

		expect(events).toEqual([
			"preview:4",
			"cancel:4",
			"preview:4",
			"commit:4:timeout",
		]);
	});

	test("cancelling removes the preview and prevents a late commit", () => {
		const { controller, callbacks, events, flush } = createHarness();
		controller.tap({ row: 1, col: 2, value: 4 }, callbacks);
		expect(controller.cancel()).toBe(true);
		flush();

		expect(events).toEqual(["preview:4", "cancel:4"]);
		expect(controller.cancel()).toBe(false);
	});

	test("flushing commits immediately and prevents a duplicate late commit", () => {
		const { controller, callbacks, events, flush } = createHarness();
		controller.tap({ row: 1, col: 2, value: 4 }, callbacks);
		expect(controller.flush()).toBe(true);
		flush();

		expect(events).toEqual(["preview:4", "commit:4:flush"]);
		expect(controller.flush()).toBe(false);
	});
});
