import { describe, expect, test } from "bun:test";
import { getMotionExit, getMotionInitial } from "./motion";

describe("motion preferences", () => {
	const animation = { opacity: 0, y: 20 };

	test("removes hidden entry and exit states when motion is reduced", () => {
		expect(getMotionInitial(true, animation)).toBe(false);
		expect(getMotionExit(true, animation)).toBeUndefined();
	});

	test("preserves animations for normal and unknown preferences", () => {
		expect(getMotionInitial(false, animation)).toBe(animation);
		expect(getMotionExit(false, animation)).toBe(animation);
		expect(getMotionInitial(null, animation)).toBe(animation);
		expect(getMotionExit(null, animation)).toBe(animation);
	});
});
