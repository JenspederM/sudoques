import { useEffect } from "react";
import {
	createScreenWakeLockController,
	type ScreenWakeLockSentinel,
} from "@/lib/screenWakeLock";

type WakeLockManager = {
	request: (type: "screen") => Promise<ScreenWakeLockSentinel>;
};

export function useScreenWakeLock() {
	useEffect(() => {
		const wakeLock = (navigator as Navigator & { wakeLock?: WakeLockManager })
			.wakeLock;
		const controller = createScreenWakeLockController({
			request: wakeLock ? () => wakeLock.request("screen") : undefined,
			isVisible: () => document.visibilityState === "visible",
			addVisibilityListener: (listener) =>
				document.addEventListener("visibilitychange", listener),
			removeVisibilityListener: (listener) =>
				document.removeEventListener("visibilitychange", listener),
		});

		controller.start();
		return () => controller.stop();
	}, []);
}
