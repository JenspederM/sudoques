export const GAME_ROUTE_ACTIVE_CLASS = "game-route-active";
export const GAME_EDGE_GUARD_PX = 24;

type ClassListLike = Pick<DOMTokenList, "add" | "contains" | "remove">;

export type GameGestureDocument = {
	documentElement: { classList: ClassListLike; clientWidth?: number };
	body: { classList: ClassListLike };
	defaultView?: { innerWidth: number } | null;
	addEventListener?: EventTarget["addEventListener"];
	removeEventListener?: EventTarget["removeEventListener"];
};

type ContainmentState = {
	count: number;
	documentElementHadClass: boolean;
	bodyHadClass: boolean;
	releaseEdgeGuard: (() => void) | null;
};

const containmentStates = new WeakMap<GameGestureDocument, ContainmentState>();

export function isGameNavigationEdge(
	clientX: number,
	viewportWidth: number,
	edgeWidth = GAME_EDGE_GUARD_PX,
) {
	if (!Number.isFinite(clientX) || viewportWidth <= 0 || edgeWidth < 0) {
		return false;
	}
	return clientX <= edgeWidth || clientX >= viewportWidth - edgeWidth;
}

function installEdgeTouchGuard(target: GameGestureDocument) {
	if (!target.addEventListener || !target.removeEventListener) return null;

	let edgeTouchActive = false;
	const listenerOptions = { capture: true, passive: false } as const;
	const viewportWidth = () =>
		target.defaultView?.innerWidth ?? target.documentElement.clientWidth ?? 0;
	const preventIfCancelable = (event: TouchEvent) => {
		if (event.cancelable) event.preventDefault();
	};
	const handleTouchStart: EventListener = (event) => {
		const touchEvent = event as TouchEvent;
		const touch = touchEvent.touches[0];
		edgeTouchActive = Boolean(
			touch && isGameNavigationEdge(touch.clientX, viewportWidth()),
		);
		if (edgeTouchActive) preventIfCancelable(touchEvent);
	};
	const handleTouchMove: EventListener = (event) => {
		if (edgeTouchActive) preventIfCancelable(event as TouchEvent);
	};
	const resetEdgeTouch: EventListener = () => {
		edgeTouchActive = false;
	};

	target.addEventListener("touchstart", handleTouchStart, listenerOptions);
	target.addEventListener("touchmove", handleTouchMove, listenerOptions);
	target.addEventListener("touchend", resetEdgeTouch, true);
	target.addEventListener("touchcancel", resetEdgeTouch, true);

	return () => {
		target.removeEventListener?.(
			"touchstart",
			handleTouchStart,
			listenerOptions,
		);
		target.removeEventListener?.("touchmove", handleTouchMove, listenerOptions);
		target.removeEventListener?.("touchend", resetEdgeTouch, true);
		target.removeEventListener?.("touchcancel", resetEdgeTouch, true);
	};
}

/**
 * Marks the current document as an active game route so CSS can contain
 * horizontal browser navigation gestures. The returned release function is
 * idempotent and reference counted for React Strict Mode/remount safety.
 */
export function acquireGameGestureContainment(
	target: GameGestureDocument,
): () => void {
	let state = containmentStates.get(target);

	if (state) {
		state.count += 1;
	} else {
		state = {
			count: 1,
			documentElementHadClass: target.documentElement.classList.contains(
				GAME_ROUTE_ACTIVE_CLASS,
			),
			bodyHadClass: target.body.classList.contains(GAME_ROUTE_ACTIVE_CLASS),
			releaseEdgeGuard: installEdgeTouchGuard(target),
		};
		containmentStates.set(target, state);
		target.documentElement.classList.add(GAME_ROUTE_ACTIVE_CLASS);
		target.body.classList.add(GAME_ROUTE_ACTIVE_CLASS);
	}

	let released = false;
	return () => {
		if (released) return;
		released = true;

		const currentState = containmentStates.get(target);
		if (!currentState) return;

		if (currentState.count > 1) {
			currentState.count -= 1;
			return;
		}

		containmentStates.delete(target);
		currentState.releaseEdgeGuard?.();
		if (!currentState.documentElementHadClass) {
			target.documentElement.classList.remove(GAME_ROUTE_ACTIVE_CLASS);
		}
		if (!currentState.bodyHadClass) {
			target.body.classList.remove(GAME_ROUTE_ACTIVE_CLASS);
		}
	};
}
