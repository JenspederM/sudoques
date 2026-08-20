import { describe, expect, test } from "bun:test";
import {
	createCellGestureNumpadController,
	getGesturePadLayout,
	getGesturePadValueAtPoint,
	type OpenCellGesture,
} from "./cellGestureNumpad";

const cellRect = { left: 150, top: 300, width: 40, height: 40 };
const viewport = { left: 0, top: 0, width: 375, height: 667 };

function createHarness() {
	const scheduled: Array<{ callback: () => void; cancelled: boolean }> = [];
	const opens: Array<OpenCellGesture | null> = [];
	const arms: string[] = [];
	const commits: Array<{
		row: number;
		col: number;
		value: number;
		mode: string;
	}> = [];
	const selected: Array<{ row: number; col: number }> = [];
	const focused: Array<{ row: number; col: number }> = [];
	let disarms = 0;
	const controller = createCellGestureNumpadController({
		callbacks: {
			onArm: (mode) => arms.push(mode),
			onDisarm: () => {
				disarms += 1;
			},
			onOpenChange: (gesture) => opens.push(gesture),
			onFocusTarget: (target) => focused.push(target),
			onSelect: (target) => selected.push(target),
			onCommit: (input) => commits.push(input),
		},
		schedule: (callback) => {
			const task = { callback, cancelled: false };
			scheduled.push(task);
			return () => {
				task.cancelled = true;
			};
		},
	});
	const down = (
		overrides: Partial<Parameters<typeof controller.pointerDown>[0]> = {},
	) =>
		controller.pointerDown({
			pointerId: 1,
			row: 2,
			col: 3,
			x: 170,
			y: 320,
			time: 100,
			cellRect,
			viewport,
			globalNoteMode: false,
			canEnterValue: true,
			canEnterNote: true,
			...overrides,
		});
	const runScheduled = (index = scheduled.length - 1) => {
		const task = scheduled[index];
		if (task && !task.cancelled) task.callback();
	};
	return {
		controller,
		down,
		runScheduled,
		scheduled,
		opens,
		arms,
		commits,
		selected,
		focused,
		getDisarms: () => disarms,
	};
}

const centerOfKey = (gesture: OpenCellGesture, value: number) => {
	const key = gesture.layout.keys.find(
		(candidate) => candidate.value === value,
	);
	if (!key) throw new Error(`Missing key ${value}`);
	return {
		x: key.rect.left + key.rect.width / 2,
		y: key.rect.top + key.rect.height / 2,
	};
};

describe("gesture pad geometry", () => {
	test("uses the strict left, above, right, below placement order", () => {
		const leftCell = { left: 250, top: 300, width: 40, height: 40 };
		const leftLayout = getGesturePadLayout(leftCell, viewport);
		expect(leftLayout.left + leftLayout.width).toBe(leftCell.left - 12);

		const aboveCell = { left: 100, top: 300, width: 40, height: 40 };
		const aboveLayout = getGesturePadLayout(aboveCell, viewport);
		expect(aboveLayout.top + aboveLayout.height).toBe(aboveCell.top - 12);

		const rightCell = { left: 30, top: 100, width: 40, height: 40 };
		const rightLayout = getGesturePadLayout(rightCell, viewport);
		expect(rightLayout.left).toBe(rightCell.left + rightCell.width + 12);

		const belowCell = { left: 150, top: 100, width: 40, height: 40 };
		const belowLayout = getGesturePadLayout(belowCell, viewport);
		expect(belowLayout.top).toBe(belowCell.top + belowCell.height + 12);
	});

	test("clamps inside an offset iPhone-sized visual viewport", () => {
		const layout = getGesturePadLayout(
			{ left: 318, top: 570, width: 40, height: 40 },
			{ left: 9, top: 22, width: 375, height: 667 },
		);

		expect(layout.left).toBeGreaterThanOrEqual(21);
		expect(layout.top).toBeGreaterThanOrEqual(34);
		expect(layout.left + layout.width).toBeLessThanOrEqual(372);
		expect(layout.top + layout.height).toBeLessThanOrEqual(677);
	});

	test("only resolves the actual key surface, not gaps, margins, or disabled keys", () => {
		const layout = getGesturePadLayout(cellRect, viewport);
		const first = layout.keys[0];
		if (!first) throw new Error("Missing first key");
		const firstCenter = {
			x: first.rect.left + first.rect.width / 2,
			y: first.rect.top + first.rect.height / 2,
		};

		expect(getGesturePadValueAtPoint(layout, firstCenter)).toBe(1);
		expect(getGesturePadValueAtPoint(layout, firstCenter, [1])).toBeNull();
		expect(
			getGesturePadValueAtPoint(layout, {
				x: first.rect.left + first.rect.width + layout.gap / 2,
				y: firstCenter.y,
			}),
		).toBeNull();
		expect(
			getGesturePadValueAtPoint(layout, {
				x: layout.left + 1,
				y: layout.top + 1,
			}),
		).toBeNull();
	});
});

describe("cell gesture controller", () => {
	test("opens after a stationary hold and commits the released key", () => {
		const harness = createHarness();
		harness.down();
		expect(harness.arms).toEqual(["value"]);
		expect(harness.opens).toHaveLength(0);

		harness.runScheduled();
		const open = harness.controller.getOpenGesture();
		if (!open) throw new Error("Gesture did not open");
		expect(harness.focused).toEqual([{ row: 2, col: 3 }]);

		const point = centerOfKey(open, 6);
		harness.controller.pointerMove({ pointerId: 1, time: 370, ...point });
		expect(harness.controller.getOpenGesture()?.activeValue).toBe(6);
		expect(
			harness.controller.pointerUp({ pointerId: 1, time: 380, ...point }),
		).toBe(true);
		expect(harness.commits).toEqual([
			{ row: 2, col: 3, value: 6, mode: "value" },
		]);
		expect(harness.opens.at(-1)).toBeNull();
		expect(harness.getDisarms()).toBe(1);
	});

	test("opens immediately once a drag crosses the movement threshold", () => {
		const harness = createHarness();
		harness.down();
		harness.controller.pointerMove({
			pointerId: 1,
			time: 120,
			x: 183,
			y: 320,
		});

		expect(harness.controller.getOpenGesture()).not.toBeNull();
		expect(harness.scheduled[0]?.cancelled).toBe(true);
	});

	test("a short tap only selects the cell", () => {
		const harness = createHarness();
		harness.down();
		harness.controller.pointerUp({
			pointerId: 1,
			time: 180,
			x: 170,
			y: 320,
		});

		expect(harness.selected).toEqual([{ row: 2, col: 3 }]);
		expect(harness.commits).toHaveLength(0);
		expect(harness.opens).toHaveLength(0);
	});

	test("double-tap-and-hold enters note mode with no value preview or commit", () => {
		const harness = createHarness();
		harness.down();
		harness.controller.pointerUp({
			pointerId: 1,
			time: 150,
			x: 170,
			y: 320,
		});
		harness.down({ pointerId: 2, time: 300 });
		expect(harness.arms).toEqual(["value", "note"]);
		harness.runScheduled();
		const open = harness.controller.getOpenGesture();
		if (!open) throw new Error("Note gesture did not open");
		expect(open.mode).toBe("note");

		const point = centerOfKey(open, 8);
		harness.controller.pointerUp({ pointerId: 2, time: 570, ...point });
		expect(harness.commits).toEqual([
			{ row: 2, col: 3, value: 8, mode: "note" },
		]);
		expect(harness.commits.some((commit) => commit.mode === "value")).toBe(
			false,
		);
	});

	test("global Notes mode opens the first gesture directly as a note", () => {
		const harness = createHarness();
		harness.down({ globalNoteMode: true });
		harness.runScheduled();
		expect(harness.controller.getOpenGesture()?.mode).toBe("note");
	});

	test("release outside, a disabled key, cancellation, and another pointer never commit", () => {
		const harness = createHarness();
		harness.down({ disabledNumbers: [4] });
		harness.runScheduled();
		const firstOpen = harness.controller.getOpenGesture();
		if (!firstOpen) throw new Error("Gesture did not open");
		const disabledPoint = centerOfKey(firstOpen, 4);
		expect(
			harness.controller.pointerUp({
				pointerId: 99,
				time: 370,
				...disabledPoint,
			}),
		).toBe(false);
		expect(harness.controller.getOpenGesture()).not.toBeNull();
		harness.controller.pointerUp({
			pointerId: 1,
			time: 380,
			...disabledPoint,
		});
		expect(harness.commits).toHaveLength(0);

		harness.down({ pointerId: 2, time: 700 });
		harness.runScheduled();
		harness.controller.pointerUp({
			pointerId: 2,
			time: 980,
			x: 2,
			y: 2,
		});
		expect(harness.commits).toHaveLength(0);

		harness.down({ pointerId: 3, time: 1_200 });
		harness.runScheduled();
		expect(harness.controller.cancel()).toBe(true);
		expect(harness.commits).toHaveLength(0);
		expect(harness.controller.getOpenGesture()).toBeNull();
	});

	test("invalid note gestures on a filled cell never arm or open", () => {
		const harness = createHarness();
		const result = harness.down({
			globalNoteMode: true,
			canEnterValue: true,
			canEnterNote: false,
		});
		expect(result).toEqual({ mode: "note", canOpen: false });
		expect(harness.arms).toHaveLength(0);
		expect(harness.scheduled).toHaveLength(0);
	});

	test("commits to the pointer-down cell even if another cell becomes selected", () => {
		const harness = createHarness();
		harness.down({ row: 7, col: 8 });
		harness.runScheduled();
		const open = harness.controller.getOpenGesture();
		if (!open) throw new Error("Gesture did not open");
		// Simulates unrelated selection state changing while the pointer is held.
		harness.selected.push({ row: 0, col: 0 });
		const point = centerOfKey(open, 9);
		harness.controller.pointerUp({ pointerId: 1, time: 380, ...point });

		expect(harness.commits).toEqual([
			{ row: 7, col: 8, value: 9, mode: "value" },
		]);
	});
});
