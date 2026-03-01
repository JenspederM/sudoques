import { useEffect, useState } from "react";
import { usePageVisibility } from "@/hooks/usePageVisibility";

export function useGameTimer(initialTime: number, isPaused: boolean) {
	const [time, setTime] = useState(initialTime);

	// Sync local time with initialTime if it changes (e.g., when a game loads)
	useEffect(() => {
		setTime(initialTime);
	}, [initialTime]);

	const isVisible = usePageVisibility();

	useEffect(() => {
		if (isPaused || !isVisible) return;

		const interval = setInterval(() => {
			setTime((t) => t + 1);
		}, 1000);

		return () => clearInterval(interval);
	}, [isPaused, isVisible]);

	return { time, setTime };
}
