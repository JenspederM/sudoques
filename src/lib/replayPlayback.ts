type TimedAction = {
	delta: number;
};

export type ReplayPlaybackState = {
	time: number;
	actionIndex: number;
	isPlaying: boolean;
};

const clampTime = (time: number, totalTime: number) =>
	Math.min(Math.max(time, 0), totalTime);

export const getReplayActionIndexAtTime = (
	actions: readonly TimedAction[],
	time: number,
): number => {
	let index = 0;
	while (
		index < actions.length &&
		(actions[index]?.delta ?? Infinity) <= time
	) {
		index += 1;
	}
	return index;
};

export const createReplayPlaybackState = (
	actions: readonly TimedAction[],
): ReplayPlaybackState => ({
	time: 0,
	actionIndex: getReplayActionIndexAtTime(actions, 0),
	isPlaying: false,
});

export const seekReplayPlayback = (
	actions: readonly TimedAction[],
	state: ReplayPlaybackState,
	time: number,
	totalTime: number,
): ReplayPlaybackState => {
	const nextTime = clampTime(time, totalTime);
	return {
		time: nextTime,
		actionIndex: getReplayActionIndexAtTime(actions, nextTime),
		isPlaying: state.isPlaying,
	};
};

export const stepReplayForward = (
	actions: readonly TimedAction[],
	state: ReplayPlaybackState,
	totalTime: number,
): ReplayPlaybackState => {
	if (state.actionIndex >= actions.length) {
		return { time: totalTime, actionIndex: actions.length, isPlaying: false };
	}

	const actionIndex = state.actionIndex + 1;
	return {
		time: clampTime(actions[actionIndex - 1]?.delta ?? totalTime, totalTime),
		actionIndex,
		isPlaying: false,
	};
};

export const stepReplayBack = (
	actions: readonly TimedAction[],
	state: ReplayPlaybackState,
): ReplayPlaybackState => {
	const actionIndex = Math.max(0, state.actionIndex - 1);
	return {
		time: actionIndex === 0 ? 0 : (actions[actionIndex - 1]?.delta ?? 0),
		actionIndex,
		isPlaying: false,
	};
};

export const advanceReplayPlayback = (
	actions: readonly TimedAction[],
	state: ReplayPlaybackState,
	elapsed: number,
	speedMultiplier: number,
	totalTime: number,
): ReplayPlaybackState => {
	const time = clampTime(
		state.time + Math.max(elapsed, 0) * speedMultiplier,
		totalTime,
	);
	const actionIndex = getReplayActionIndexAtTime(actions, time);
	return {
		time,
		actionIndex,
		isPlaying: time < totalTime,
	};
};

export const toggleReplayPlayback = (
	actions: readonly TimedAction[],
	state: ReplayPlaybackState,
	totalTime: number,
): ReplayPlaybackState => {
	if (state.isPlaying) return { ...state, isPlaying: false };

	const isAtEnd =
		state.time >= totalTime && state.actionIndex >= actions.length;
	const start = isAtEnd ? createReplayPlaybackState(actions) : state;
	return { ...start, isPlaying: true };
};
