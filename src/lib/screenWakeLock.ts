export interface ScreenWakeLockSentinel {
	released: boolean;
	release: () => Promise<void>;
	addEventListener: (type: "release", listener: () => void) => void;
	removeEventListener: (type: "release", listener: () => void) => void;
}

interface ScreenWakeLockControllerOptions {
	request?: () => Promise<ScreenWakeLockSentinel>;
	isVisible: () => boolean;
	addVisibilityListener: (listener: () => void) => void;
	removeVisibilityListener: (listener: () => void) => void;
}

/**
 * Owns one best-effort screen wake lock for the lifetime of a game page.
 * Browsers release screen locks when a page is hidden, so the controller
 * deliberately reacquires one when the document becomes visible again.
 */
export function createScreenWakeLockController({
	request,
	isVisible,
	addVisibilityListener,
	removeVisibilityListener,
}: ScreenWakeLockControllerOptions) {
	let active = false;
	let sentinel: ScreenWakeLockSentinel | null = null;
	let sentinelReleaseListener: (() => void) | null = null;
	let pendingRequest: Promise<ScreenWakeLockSentinel> | null = null;

	const releaseHeldLock = () => {
		const heldLock = sentinel;
		if (!heldLock) return;
		if (sentinelReleaseListener)
			heldLock.removeEventListener("release", sentinelReleaseListener);
		sentinel = null;
		sentinelReleaseListener = null;
		void heldLock.release().catch(() => undefined);
	};

	const requestLock = async () => {
		if (
			!active ||
			!request ||
			!isVisible() ||
			(sentinel && !sentinel.released) ||
			pendingRequest
		)
			return;

		let nextRequest: Promise<ScreenWakeLockSentinel> | null = null;

		try {
			nextRequest = request();
			pendingRequest = nextRequest;
			const nextSentinel = await nextRequest;
			if (!active || !isVisible()) {
				void nextSentinel.release().catch(() => undefined);
				return;
			}

			const releaseListener = () => {
				if (sentinel !== nextSentinel) return;
				nextSentinel.removeEventListener("release", releaseListener);
				sentinel = null;
				sentinelReleaseListener = null;
			};
			sentinel = nextSentinel;
			sentinelReleaseListener = releaseListener;
			nextSentinel.addEventListener("release", sentinelReleaseListener);
		} catch {
			// Unsupported, denied, and low-power cases should never block gameplay.
		} finally {
			if (nextRequest && pendingRequest === nextRequest) pendingRequest = null;
		}
	};

	const handleVisibilityChange = () => {
		if (isVisible()) void requestLock();
		else releaseHeldLock();
	};

	return {
		start() {
			if (active) return;
			active = true;
			addVisibilityListener(handleVisibilityChange);
			void requestLock();
		},
		stop() {
			if (!active) return;
			active = false;
			removeVisibilityListener(handleVisibilityChange);
			releaseHeldLock();
		},
	};
}
