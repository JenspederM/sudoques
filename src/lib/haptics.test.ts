import { describe, expect, test } from "bun:test";
import { DOUBLE_TAP_WINDOW_MS } from "./doubleTapInput";
import {
	getInputHapticCue,
	HAPTIC_OUTCOME_SAFETY_MS,
	HAPTIC_PATTERNS,
	HAPTICS_STORAGE_KEY,
	readHapticsEnabled,
	writeHapticsEnabled,
} from "./haptics";

describe("haptic preferences", () => {
	test("defaults to enabled when no preference is stored", () => {
		expect(readHapticsEnabled(null)).toBe(true);
		expect(readHapticsEnabled({ getItem: () => null })).toBe(true);
	});

	test("only an explicit false value disables feedback", () => {
		expect(readHapticsEnabled({ getItem: () => "false" })).toBe(false);
		expect(readHapticsEnabled({ getItem: () => "true" })).toBe(true);
	});

	test("persists the device preference without throwing", () => {
		const values = new Map<string, string>();
		writeHapticsEnabled(
			{ setItem: (key, value) => values.set(key, value) },
			false,
		);
		expect(values.get(HAPTICS_STORAGE_KEY)).toBe("false");
		expect(() =>
			writeHapticsEnabled(
				{
					setItem: () => {
						throw new Error("blocked");
					},
				},
				true,
			),
		).not.toThrow();
	});
});

describe("haptic language", () => {
	test("maps committed inputs to distinct value, note, mistake, and success cues", () => {
		expect(getInputHapticCue({ kind: "value", isCorrect: true }, false)).toBe(
			"value",
		);
		expect(getInputHapticCue({ kind: "value", isCorrect: false }, false)).toBe(
			"incorrect",
		);
		expect(getInputHapticCue({ kind: "note" }, false)).toBe("note");
		expect(getInputHapticCue({ kind: "erase" }, false)).toBe("erase");
		expect(getInputHapticCue({ kind: "value", isCorrect: true }, true)).toBe(
			"success",
		);
	});

	test("gives values, notes, and mistakes distinct rhythms", () => {
		expect(HAPTIC_PATTERNS.value).toHaveLength(1);
		expect(HAPTIC_PATTERNS.note).toHaveLength(2);
		expect(HAPTIC_PATTERNS.incorrect).toHaveLength(2);
		expect(HAPTIC_PATTERNS.note).not.toEqual(HAPTIC_PATTERNS.incorrect);
	});

	test("delays outcomes until after the reversible preview window", () => {
		expect(HAPTIC_PATTERNS.pendingIncorrect[0]).toEqual(
			HAPTIC_PATTERNS.value[0],
		);
		const firstPhase = HAPTIC_PATTERNS.pendingIncorrect[0];
		const outcomePhase = HAPTIC_PATTERNS.pendingIncorrect[1];
		expect((firstPhase?.duration ?? 0) + (outcomePhase?.delay ?? 0)).toBe(
			DOUBLE_TAP_WINDOW_MS + HAPTIC_OUTCOME_SAFETY_MS,
		);
		expect(HAPTIC_PATTERNS.pendingSuccess[0]).toEqual(HAPTIC_PATTERNS.value[0]);
	});

	test("keeps frequent and celebratory feedback brief", () => {
		const totalDuration = (cue: keyof typeof HAPTIC_PATTERNS) => {
			const pattern = HAPTIC_PATTERNS[cue];
			if (!Array.isArray(pattern) || typeof pattern[0] === "number") return 0;
			return pattern.reduce(
				(total, vibration) =>
					total + vibration.duration + (vibration.delay ?? 0),
				0,
			);
		};

		expect(totalDuration("incorrect")).toBeGreaterThan(totalDuration("value"));
		expect(totalDuration("success")).toBeLessThan(150);
	});

	test("gives delayed Safari phases enough time to cross a render frame", () => {
		for (const cue of [
			"note",
			"incorrect",
			"success",
			"undo",
			"redo",
			"hint",
			"reset",
		] as const) {
			const delayedPhases = HAPTIC_PATTERNS[cue].slice(1);
			for (const phase of delayedPhases) {
				expect(phase.duration).toBeGreaterThanOrEqual(30);
			}
		}
	});

	test("does not schedule an opening cue that Safari cannot activate later", () => {
		expect("gestureValueOpen" in HAPTIC_PATTERNS).toBe(false);
		expect("gestureNoteOpen" in HAPTIC_PATTERNS).toBe(false);
	});
});
