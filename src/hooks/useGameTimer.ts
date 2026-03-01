import { useEffect, useState } from "react";

export function useGameTimer(initialTime: number, isPaused: boolean) {
	const [time, setTime] = useState(initialTime);

	// Sync local time with initialTime if it changes (e.g., when a game loads)
	useEffect(() => {
		setTime(initialTime);
	}, [initialTime]);

	useEffect(() => {
		if (isPaused) return;

		const interval = setInterval(() => {
			setTime((t) => t + 1);
		}, 1000);

		return () => clearInterval(interval);
	}, [isPaused]);

	return { time, setTime };
}
