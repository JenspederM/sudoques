const PREVENTED_TOUCH_EVENTS = ["touchstart", "touchmove"] as const;
const PREVENTED_SELECTION_EVENTS = ["selectstart", "dragstart"] as const;

/**
 * iOS can briefly start its text loupe before React's pointer handler runs.
 * Native non-passive touch listeners stop that default action at the board
 * boundary while leaving ordinary document scrolling untouched.
 */
export function installBoardGestureSuppression(surface: HTMLElement) {
	const preventNativeGesture: EventListener = (event) => {
		if (event.cancelable) event.preventDefault();
	};

	for (const type of PREVENTED_TOUCH_EVENTS) {
		surface.addEventListener(type, preventNativeGesture, { passive: false });
	}
	for (const type of PREVENTED_SELECTION_EVENTS) {
		surface.addEventListener(type, preventNativeGesture);
	}

	return () => {
		for (const type of [
			...PREVENTED_TOUCH_EVENTS,
			...PREVENTED_SELECTION_EVENTS,
		]) {
			surface.removeEventListener(type, preventNativeGesture);
		}
	};
}
