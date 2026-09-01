export const DOUBLE_TAP_WINDOW_MS = 280;

export type PendingNumberInput = {
	row: number;
	col: number;
	value: number;
};

export type PendingNoteToggle = PendingNumberInput & {
	shouldExist: boolean;
};

type PendingInputCallbacks = {
	onPreview: (input: PendingNumberInput) => void;
	onCommit: (input: PendingNumberInput, reason: "timeout" | "flush") => void;
	onNote: (input: PendingNumberInput) => void;
	onCancel: (input: PendingNumberInput) => void;
};

type ScheduleCommit = (callback: () => void, delay: number) => () => void;

const scheduleTimeout: ScheduleCommit = (callback, delay) => {
	const timeout = globalThis.setTimeout(callback, delay);
	return () => globalThis.clearTimeout(timeout);
};

const isSameInput = (a: PendingNumberInput, b: PendingNumberInput) =>
	a.row === b.row && a.col === b.col && a.value === b.value;

/**
 * Keeps the first tap reversible until the double-tap window closes. The
 * caller owns the visual preview and the eventual game actions.
 */
export function createDoubleTapInputController({
	delay = DOUBLE_TAP_WINDOW_MS,
	schedule = scheduleTimeout,
}: {
	delay?: number;
	schedule?: ScheduleCommit;
} = {}) {
	let pending:
		| {
				input: PendingNumberInput;
				callbacks: PendingInputCallbacks;
		  }
		| undefined;
	let cancelScheduledCommit: (() => void) | undefined;

	const clearPending = () => {
		cancelScheduledCommit?.();
		cancelScheduledCommit = undefined;
		const previous = pending;
		pending = undefined;
		return previous;
	};

	return {
		tap(input: PendingNumberInput, callbacks: PendingInputCallbacks) {
			if (pending && isSameInput(pending.input, input)) {
				clearPending();
				callbacks.onNote(input);
				return "note" as const;
			}

			const previous = clearPending();
			if (previous) previous.callbacks.onCancel(previous.input);

			pending = { input, callbacks };
			callbacks.onPreview(input);
			cancelScheduledCommit = schedule(() => {
				const committed = pending;
				pending = undefined;
				cancelScheduledCommit = undefined;
				if (committed) committed.callbacks.onCommit(committed.input, "timeout");
			}, delay);
			return "preview" as const;
		},

		cancel() {
			const previous = clearPending();
			if (!previous) return false;
			previous.callbacks.onCancel(previous.input);
			return true;
		},

		flush() {
			const committed = clearPending();
			if (!committed) return false;
			committed.callbacks.onCommit(committed.input, "flush");
			return true;
		},

		hasPending() {
			return pending !== undefined;
		},

		dispose() {
			clearPending();
		},
	};
}
