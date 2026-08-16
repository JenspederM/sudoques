export type PointerPosition = {
	x: number;
	y: number;
};

type ScheduleHold = (callback: () => void, delay: number) => () => void;

type PressAndHoldOptions = {
	delay?: number;
	maxMovement?: number;
	schedule?: ScheduleHold;
};

const scheduleTimeout: ScheduleHold = (callback, delay) => {
	const timeout = setTimeout(callback, delay);
	return () => clearTimeout(timeout);
};

export function createPressAndHoldController({
	delay = 450,
	maxMovement = 12,
	schedule = scheduleTimeout,
}: PressAndHoldOptions = {}) {
	let cancelScheduledHold: (() => void) | null = null;
	let origin: PointerPosition | null = null;
	let didTrigger = false;

	const cancelPendingHold = () => {
		cancelScheduledHold?.();
		cancelScheduledHold = null;
		origin = null;
	};

	return {
		start(position: PointerPosition, onHold: () => void) {
			cancelPendingHold();
			didTrigger = false;
			origin = position;
			cancelScheduledHold = schedule(() => {
				cancelScheduledHold = null;
				origin = null;
				didTrigger = true;
				onHold();
			}, delay);
		},

		move(position: PointerPosition) {
			if (!origin) return;
			if (
				Math.hypot(position.x - origin.x, position.y - origin.y) > maxMovement
			) {
				cancelPendingHold();
			}
		},

		end() {
			cancelPendingHold();
		},

		consumeClick() {
			if (!didTrigger) return false;
			didTrigger = false;
			return true;
		},

		dispose() {
			cancelPendingHold();
			didTrigger = false;
		},
	};
}
