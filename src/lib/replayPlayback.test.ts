import { describe, expect, test } from "bun:test";
import {
	advanceReplayPlayback,
	getReplayActionIndexAtTime,
	type ReplayPlaybackState,
	seekReplayPlayback,
	stepReplayBack,
	stepReplayForward,
	toggleReplayPlayback,
} from "./replayPlayback";

const actions = (deltas: number[]) => deltas.map((delta) => ({ delta }));

describe("replay playback", () => {
	test("a time-based seek includes every action at the selected timestamp", () => {
		const replayActions = actions([2, 5, 5, 5, 9]);

		expect(getReplayActionIndexAtTime(replayActions, 4.99)).toBe(1);
		expect(getReplayActionIndexAtTime(replayActions, 5)).toBe(4);
	});

	test("steps back exactly one action when multiple actions share a timestamp", () => {
		const replayActions = actions([2, 5, 5, 5, 9]);
		const playing: ReplayPlaybackState = {
			time: 5,
			actionIndex: 4,
			isPlaying: true,
		};

		const firstStep = stepReplayBack(replayActions, playing);
		const secondStep = stepReplayBack(replayActions, firstStep);

		expect(firstStep).toEqual({ time: 5, actionIndex: 3, isPlaying: false });
		expect(secondStep).toEqual({ time: 5, actionIndex: 2, isPlaying: false });
	});

	test("steps forward exactly one action when multiple actions share a timestamp", () => {
		const replayActions = actions([2, 5, 5, 5, 9]);
		const paused: ReplayPlaybackState = {
			time: 5,
			actionIndex: 2,
			isPlaying: false,
		};

		expect(stepReplayForward(replayActions, paused, 12)).toEqual({
			time: 5,
			actionIndex: 3,
			isPlaying: false,
		});
	});

	test("uses the discrete action cursor when stepping between timestamps", () => {
		const replayActions = actions([2, 5, 9]);
		const initial: ReplayPlaybackState = {
			time: 0,
			actionIndex: 0,
			isPlaying: false,
		};
		const between = seekReplayPlayback(replayActions, initial, 7, 12);

		expect(between).toEqual({ time: 7, actionIndex: 2, isPlaying: false });
		expect(stepReplayBack(replayActions, between)).toEqual({
			time: 2,
			actionIndex: 1,
			isPlaying: false,
		});
		expect(stepReplayForward(replayActions, between, 12)).toEqual({
			time: 9,
			actionIndex: 3,
			isPlaying: false,
		});
	});

	test("manual stepping pauses autoplay", () => {
		const replayActions = actions([2, 5, 9]);
		const playing: ReplayPlaybackState = {
			time: 7,
			actionIndex: 2,
			isPlaying: true,
		};

		expect(stepReplayBack(replayActions, playing).isPlaying).toBe(false);
		expect(stepReplayForward(replayActions, playing, 12).isPlaying).toBe(false);
	});

	test("autoplay and slider seeking retain time-based playback", () => {
		const replayActions = actions([2, 5, 5, 9]);
		const partiallyStepped: ReplayPlaybackState = {
			time: 5,
			actionIndex: 2,
			isPlaying: true,
		};

		expect(
			advanceReplayPlayback(replayActions, partiallyStepped, 0.1, 1, 12),
		).toEqual({
			time: 5.1,
			actionIndex: 3,
			isPlaying: true,
		});
		expect(seekReplayPlayback(replayActions, partiallyStepped, 9, 12)).toEqual({
			time: 9,
			actionIndex: 4,
			isPlaying: true,
		});
	});

	test("restarting after the end returns to the beginning before playing", () => {
		const replayActions = actions([2, 5]);
		const ended: ReplayPlaybackState = {
			time: 8,
			actionIndex: 2,
			isPlaying: false,
		};

		expect(toggleReplayPlayback(replayActions, ended, 8)).toEqual({
			time: 0,
			actionIndex: 0,
			isPlaying: true,
		});
	});
});
