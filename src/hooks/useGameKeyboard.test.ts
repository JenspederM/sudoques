import { describe, expect, test } from "bun:test";
import { getNumberKeyInput } from "./useGameKeyboard";

describe("getNumberKeyInput", () => {
	test("reads an ordinary digit as a value", () => {
		expect(
			getNumberKeyInput({ key: "4", code: "Digit4", shiftKey: false }),
		).toEqual({ value: 4, asNote: false });
	});

	test("reads Shift plus a digit as a note even when key is punctuation", () => {
		expect(
			getNumberKeyInput({ key: "!", code: "Digit1", shiftKey: true }),
		).toEqual({ value: 1, asNote: true });
	});

	test("ignores non-number keys", () => {
		expect(
			getNumberKeyInput({ key: "a", code: "KeyA", shiftKey: false }),
		).toBeNull();
	});
});
