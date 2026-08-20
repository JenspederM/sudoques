export const GAME_ROUTE_ACTIVE_CLASS = "game-route-active";

type ClassListLike = Pick<DOMTokenList, "add" | "contains" | "remove">;

export type GameGestureDocument = {
	documentElement: { classList: ClassListLike };
	body: { classList: ClassListLike };
};

type ContainmentState = {
	count: number;
	documentElementHadClass: boolean;
	bodyHadClass: boolean;
};

const containmentStates = new WeakMap<GameGestureDocument, ContainmentState>();

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
		if (!currentState.documentElementHadClass) {
			target.documentElement.classList.remove(GAME_ROUTE_ACTIVE_CLASS);
		}
		if (!currentState.bodyHadClass) {
			target.body.classList.remove(GAME_ROUTE_ACTIVE_CLASS);
		}
	};
}
