import { expect, test } from "bun:test";
import { formatTime } from "./utils";

test("formatTime rounds down seconds", () => {
	expect(formatTime(65.9)).toBe("1:05");
	expect(formatTime(10.1)).toBe("0:10");
	expect(formatTime(0)).toBe("0:00");
	expect(formatTime(3600)).toBe("60:00");
});
