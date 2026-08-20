export const CELL_GESTURE_HOLD_MS = 260;
export const CELL_GESTURE_DOUBLE_TAP_MS = 280;
export const CELL_GESTURE_MOVE_THRESHOLD_PX = 12;

export type CellGestureMode = "value" | "note";

export type CellGestureTarget = {
	row: number;
	col: number;
};

export type Point = {
	x: number;
	y: number;
};

export type Rect = {
	left: number;
	top: number;
	width: number;
	height: number;
};

export type ViewportBounds = Rect;

export type GesturePadKey = {
	value: number;
	rect: Rect;
};

export type GesturePadLayout = Rect & {
	padding: number;
	gap: number;
	keySize: number;
	keys: GesturePadKey[];
};

export type OpenCellGesture = CellGestureTarget & {
	mode: CellGestureMode;
	layout: GesturePadLayout;
	activeValue: number | null;
	disabledNumbers: number[];
};

export type CellGestureCommit = CellGestureTarget & {
	mode: CellGestureMode;
	value: number;
};

const PAD_MARGIN_PX = 12;
const PAD_CELL_GAP_PX = 12;
const PAD_INNER_PADDING_PX = 8;
const PAD_KEY_GAP_PX = 6;
const MIN_PAD_SIZE_PX = 156;
const MAX_PAD_SIZE_PX = 192;

const clamp = (value: number, min: number, max: number) =>
	Math.min(Math.max(value, min), max);

const rectRight = (rect: Rect) => rect.left + rect.width;
const rectBottom = (rect: Rect) => rect.top + rect.height;

const overflowDistance = (rect: Rect, viewport: ViewportBounds) => {
	const minLeft = viewport.left + PAD_MARGIN_PX;
	const minTop = viewport.top + PAD_MARGIN_PX;
	const maxRight = rectRight(viewport) - PAD_MARGIN_PX;
	const maxBottom = rectBottom(viewport) - PAD_MARGIN_PX;
	return (
		Math.max(0, minLeft - rect.left) +
		Math.max(0, minTop - rect.top) +
		Math.max(0, rectRight(rect) - maxRight) +
		Math.max(0, rectBottom(rect) - maxBottom)
	);
};

/**
 * Places a compact 3x3 pad close to the pressed cell. The order is deliberate:
 * left keeps the player's hand away from the board, then above, right, and
 * finally below. A later side is only used when the whole pad cannot fit on an
 * earlier one. If no side fits, the least-overflowing option is clamped into
 * the visual viewport while preserving the same order for ties.
 */
export function getGesturePadLayout(
	cell: Rect,
	viewport: ViewportBounds,
): GesturePadLayout {
	const maxAvailableSize = Math.max(
		96,
		Math.min(viewport.width, viewport.height) - PAD_MARGIN_PX * 2,
	);
	const preferredSize = Math.min(viewport.width * 0.5, viewport.height * 0.38);
	const size = Math.min(
		maxAvailableSize,
		clamp(preferredSize, MIN_PAD_SIZE_PX, MAX_PAD_SIZE_PX),
	);
	const centeredLeft = cell.left + cell.width / 2 - size / 2;
	const centeredTop = cell.top + cell.height / 2 - size / 2;
	const above = {
		left: centeredLeft,
		top: cell.top - PAD_CELL_GAP_PX - size,
		width: size,
		height: size,
	};
	const below = {
		left: centeredLeft,
		top: cell.top + cell.height + PAD_CELL_GAP_PX,
		width: size,
		height: size,
	};
	const left = {
		left: cell.left - PAD_CELL_GAP_PX - size,
		top: centeredTop,
		width: size,
		height: size,
	};
	const right = {
		left: cell.left + cell.width + PAD_CELL_GAP_PX,
		top: centeredTop,
		width: size,
		height: size,
	};

	const candidates = [left, above, right, below];
	let best = candidates.find(
		(candidate) => overflowDistance(candidate, viewport) === 0,
	);
	if (!best) {
		best = candidates[0] ?? above;
		let bestOverflow = overflowDistance(best, viewport);
		for (const candidate of candidates.slice(1)) {
			const overflow = overflowDistance(candidate, viewport);
			if (overflow < bestOverflow) {
				best = candidate;
				bestOverflow = overflow;
			}
		}
	}

	const minLeft = viewport.left + PAD_MARGIN_PX;
	const minTop = viewport.top + PAD_MARGIN_PX;
	const maxLeft = rectRight(viewport) - PAD_MARGIN_PX - size;
	const maxTop = rectBottom(viewport) - PAD_MARGIN_PX - size;
	const padLeft = clamp(best.left, minLeft, Math.max(minLeft, maxLeft));
	const padTop = clamp(best.top, minTop, Math.max(minTop, maxTop));
	const keySize = (size - PAD_INNER_PADDING_PX * 2 - PAD_KEY_GAP_PX * 2) / 3;
	const keys = Array.from({ length: 9 }, (_, index) => {
		const row = Math.floor(index / 3);
		const col = index % 3;
		return {
			value: index + 1,
			rect: {
				left: padLeft + PAD_INNER_PADDING_PX + col * (keySize + PAD_KEY_GAP_PX),
				top: padTop + PAD_INNER_PADDING_PX + row * (keySize + PAD_KEY_GAP_PX),
				width: keySize,
				height: keySize,
			},
		};
	});

	return {
		left: padLeft,
		top: padTop,
		width: size,
		height: size,
		padding: PAD_INNER_PADDING_PX,
		gap: PAD_KEY_GAP_PX,
		keySize,
		keys,
	};
}

export function getGesturePadValueAtPoint(
	layout: GesturePadLayout,
	point: Point,
	disabledNumbers: readonly number[] = [],
) {
	for (const key of layout.keys) {
		if (
			point.x >= key.rect.left &&
			point.x <= rectRight(key.rect) &&
			point.y >= key.rect.top &&
			point.y <= rectBottom(key.rect)
		) {
			return disabledNumbers.includes(key.value) ? null : key.value;
		}
	}
	return null;
}

type Schedule = (callback: () => void, delay: number) => () => void;

const scheduleTimeout: Schedule = (callback, delay) => {
	const timeout = globalThis.setTimeout(callback, delay);
	return () => globalThis.clearTimeout(timeout);
};

type CellGestureCallbacks = {
	onArm: (mode: CellGestureMode) => void;
	onDisarm: () => void;
	onOpenChange: (gesture: OpenCellGesture | null) => void;
	onFocusTarget: (target: CellGestureTarget) => void;
	onSelect: (target: CellGestureTarget) => void;
	onCommit: (input: CellGestureCommit) => void;
};

type PointerDownInput = CellGestureTarget &
	Point & {
		pointerId: number;
		time: number;
		cellRect: Rect;
		viewport: ViewportBounds;
		globalNoteMode: boolean;
		canEnterValue: boolean;
		canEnterNote: boolean;
		disabledNumbers?: readonly number[];
	};

type PointerInput = Point & {
	pointerId: number;
	time: number;
};

type LastTap = CellGestureTarget & { time: number };

type PointerSession = CellGestureTarget & {
	pointerId: number;
	start: Point;
	cellRect: Rect;
	viewport: ViewportBounds;
	mode: CellGestureMode;
	canOpen: boolean;
	disabledNumbers: number[];
	open: OpenCellGesture | null;
	moved: boolean;
	armed: boolean;
	cancelHold: (() => void) | null;
};

const sameCell = (a: CellGestureTarget, b: CellGestureTarget) =>
	a.row === b.row && a.col === b.col;

export function createCellGestureNumpadController({
	callbacks,
	schedule = scheduleTimeout,
	holdDelay = CELL_GESTURE_HOLD_MS,
	doubleTapWindow = CELL_GESTURE_DOUBLE_TAP_MS,
	moveThreshold = CELL_GESTURE_MOVE_THRESHOLD_PX,
}: {
	callbacks: CellGestureCallbacks;
	schedule?: Schedule;
	holdDelay?: number;
	doubleTapWindow?: number;
	moveThreshold?: number;
}) {
	let session: PointerSession | null = null;
	let lastTap: LastTap | null = null;

	const cancelHold = (activeSession: PointerSession) => {
		activeSession.cancelHold?.();
		activeSession.cancelHold = null;
	};

	const disarm = (activeSession: PointerSession) => {
		if (!activeSession.armed) return;
		activeSession.armed = false;
		callbacks.onDisarm();
	};

	const setOpenState = (
		activeSession: PointerSession,
		activeValue: number | null,
	) => {
		if (!activeSession.open) return;
		activeSession.open = { ...activeSession.open, activeValue };
		callbacks.onOpenChange(activeSession.open);
	};

	const open = (activeSession: PointerSession, point?: Point) => {
		if (
			session !== activeSession ||
			activeSession.open ||
			!activeSession.canOpen
		)
			return false;
		cancelHold(activeSession);
		const layout = getGesturePadLayout(
			activeSession.cellRect,
			activeSession.viewport,
		);
		const activeValue = point
			? getGesturePadValueAtPoint(layout, point, activeSession.disabledNumbers)
			: null;
		activeSession.open = {
			row: activeSession.row,
			col: activeSession.col,
			mode: activeSession.mode,
			layout,
			activeValue,
			disabledNumbers: activeSession.disabledNumbers,
		};
		lastTap = null;
		callbacks.onFocusTarget({ row: activeSession.row, col: activeSession.col });
		callbacks.onOpenChange(activeSession.open);
		return true;
	};

	const close = (activeSession: PointerSession) => {
		cancelHold(activeSession);
		disarm(activeSession);
		if (activeSession.open) callbacks.onOpenChange(null);
		activeSession.open = null;
		if (session === activeSession) session = null;
	};

	return {
		pointerDown(input: PointerDownInput) {
			if (session) close(session);
			const target = { row: input.row, col: input.col };
			const sinceLastTap = lastTap ? input.time - lastTap.time : Infinity;
			const isSecondTap =
				lastTap !== null &&
				sameCell(lastTap, target) &&
				sinceLastTap >= 0 &&
				sinceLastTap <= doubleTapWindow;
			const mode: CellGestureMode =
				input.globalNoteMode || isSecondTap ? "note" : "value";
			const canOpen =
				mode === "note" ? input.canEnterNote : input.canEnterValue;
			const activeSession: PointerSession = {
				...target,
				pointerId: input.pointerId,
				start: { x: input.x, y: input.y },
				cellRect: input.cellRect,
				viewport: input.viewport,
				mode,
				canOpen,
				disabledNumbers: [...(input.disabledNumbers ?? [])],
				open: null,
				moved: false,
				armed: false,
				cancelHold: null,
			};
			session = activeSession;
			if (canOpen) {
				activeSession.armed = true;
				callbacks.onArm(mode);
				activeSession.cancelHold = schedule(
					() => open(activeSession),
					holdDelay,
				);
			}
			return { mode, canOpen };
		},

		pointerMove(input: PointerInput) {
			const activeSession = session;
			if (!activeSession || activeSession.pointerId !== input.pointerId) return;
			const distance = Math.hypot(
				input.x - activeSession.start.x,
				input.y - activeSession.start.y,
			);
			if (distance >= moveThreshold) activeSession.moved = true;
			if (!activeSession.open && activeSession.moved) {
				open(activeSession, input);
				return;
			}
			if (!activeSession.open) return;
			const activeValue = getGesturePadValueAtPoint(
				activeSession.open.layout,
				input,
				activeSession.disabledNumbers,
			);
			if (activeValue !== activeSession.open.activeValue) {
				setOpenState(activeSession, activeValue);
			}
		},

		pointerUp(input: PointerInput) {
			const activeSession = session;
			if (!activeSession || activeSession.pointerId !== input.pointerId)
				return false;
			if (activeSession.open) {
				const value = getGesturePadValueAtPoint(
					activeSession.open.layout,
					input,
					activeSession.disabledNumbers,
				);
				const commit =
					value === null
						? null
						: {
								row: activeSession.row,
								col: activeSession.col,
								mode: activeSession.mode,
								value,
							};
				close(activeSession);
				if (commit) callbacks.onCommit(commit);
				return commit !== null;
			}

			const shouldSelect = !activeSession.moved;
			close(activeSession);
			if (shouldSelect) {
				lastTap = {
					row: activeSession.row,
					col: activeSession.col,
					time: input.time,
				};
				callbacks.onSelect({ row: activeSession.row, col: activeSession.col });
			}
			return false;
		},

		cancel() {
			if (!session) return false;
			close(session);
			return true;
		},

		resetTapHistory() {
			lastTap = null;
		},

		hasActivePointer(pointerId?: number) {
			return (
				session !== null &&
				(pointerId === undefined || session.pointerId === pointerId)
			);
		},

		getOpenGesture() {
			return session?.open ?? null;
		},

		dispose() {
			if (session) close(session);
			lastTap = null;
		},
	};
}
