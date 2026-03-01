import { useEffect, useState } from "react";

export function usePageVisibility() {
	const [isVisible, setIsVisible] = useState(
		typeof document !== "undefined"
			? document.visibilityState === "visible"
			: true,
	);

	useEffect(() => {
		if (typeof document === "undefined") return;

		const handleVisibilityChange = () => {
			setIsVisible(document.visibilityState === "visible");
		};

		document.addEventListener("visibilitychange", handleVisibilityChange);

		return () => {
			document.removeEventListener("visibilitychange", handleVisibilityChange);
		};
	}, []);

	return isVisible;
}
