import type { Vibration } from "web-haptics";
import { DOUBLE_TAP_WINDOW_MS } from "@/lib/doubleTapInput";

export type HapticCue =
	| "value"
	| "note"
	| "erase"
	| "incorrect"
	| "undo"
	| "redo"
	| "mode"
	| "hint"
	| "reset"
	| "success"
	| "pendingIncorrect"
	| "pendingSuccess";

const VALUE_PATTERN: Vibration[] = [{ duration: 18, intensity: 0.7 }];
const NOTE_PATTERN: Vibration[] = [
	{ duration: 18, intensity: 0.3 },
	{ delay: 32, duration: 34, intensity: 0.85 },
];
const INCORRECT_PATTERN: Vibration[] = [
	{ duration: 34, intensity: 1 },
	{ delay: 48, duration: 34, intensity: 1 },
];
const SUCCESS_PATTERN: Vibration[] = [
	{ duration: 18, intensity: 0.45 },
	{ delay: 30, duration: 30, intensity: 0.7 },
	{ delay: 30, duration: 30, intensity: 1 },
];

const valueFeedbackDuration = VALUE_PATTERN.reduce(
	(total, vibration) => total + vibration.duration + (vibration.delay ?? 0),
	0,
);
export const HAPTIC_OUTCOME_SAFETY_MS = 32;

const afterDoubleTapWindow = (outcome: Vibration[]): Vibration[] => [
	...VALUE_PATTERN.map((vibration) => ({ ...vibration })),
	...outcome.map((vibration, index) =>
		index === 0
			? {
					...vibration,
					delay:
						(vibration.delay ?? 0) +
						Math.max(
							0,
							DOUBLE_TAP_WINDOW_MS +
								HAPTIC_OUTCOME_SAFETY_MS -
								valueFeedbackDuration,
						),
				}
			: { ...vibration },
	),
];

// Keep frequent interactions crisp and short. Longer patterns are reserved for
// moments that need a clearly different meaning, such as a mistake or victory.
export const HAPTIC_PATTERNS: Record<HapticCue, Vibration[]> = {
	value: VALUE_PATTERN,
	note: NOTE_PATTERN,
	erase: [{ duration: 18, intensity: 0.35 }],
	incorrect: INCORRECT_PATTERN,
	undo: [
		{ duration: 12, intensity: 0.45 },
		{ delay: 22, duration: 30, intensity: 0.2 },
	],
	redo: [
		{ duration: 12, intensity: 0.2 },
		{ delay: 22, duration: 30, intensity: 0.5 },
	],
	mode: [{ duration: 8, intensity: 0.3 }],
	hint: [
		{ duration: 14, intensity: 0.45 },
		{ delay: 50, duration: 30, intensity: 0.2 },
	],
	reset: [
		{ duration: 22, intensity: 0.65 },
		{ delay: 48, duration: 30, intensity: 0.3 },
	],
	success: SUCCESS_PATTERN,
	pendingIncorrect: afterDoubleTapWindow(INCORRECT_PATTERN),
	pendingSuccess: afterDoubleTapWindow(SUCCESS_PATTERN),
};

export function getHapticPattern(cue: HapticCue): Vibration[] {
	return HAPTIC_PATTERNS[cue];
}

export const HAPTICS_STORAGE_KEY = "sudoques:haptics-enabled";

type ReadableStorage = Pick<Storage, "getItem">;
type WritableStorage = Pick<Storage, "setItem">;

export function readHapticsEnabled(storage?: ReadableStorage | null) {
	if (!storage) return true;
	try {
		return storage.getItem(HAPTICS_STORAGE_KEY) !== "false";
	} catch {
		return true;
	}
}

export function writeHapticsEnabled(
	storage: WritableStorage | null | undefined,
	enabled: boolean,
) {
	if (!storage) return;
	try {
		storage.setItem(HAPTICS_STORAGE_KEY, String(enabled));
	} catch {
		// Haptics are optional; storage restrictions must never block the game.
	}
}
