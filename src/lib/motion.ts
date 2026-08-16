export function getMotionInitial<T>(
	shouldReduceMotion: boolean | null,
	initial: T,
): T | false {
	return shouldReduceMotion ? false : initial;
}

export function getMotionExit<T>(
	shouldReduceMotion: boolean | null,
	exit: T,
): T | undefined {
	return shouldReduceMotion ? undefined : exit;
}
