import { describe, expect, test } from "bun:test";
import { Timestamp } from "firebase/firestore";
import type { GameState } from "@/types";
import {
	clearGuestGameState,
	GUEST_GAME_STORAGE_KEY,
	type GuestGameStorage,
	loadGuestGameState,
	resolveGuestGameState,
	saveGuestGameState,
} from "./guestGameStorage";

type SavedGameState = Omit<GameState, "lastUpdated">;

class MemoryStorage implements GuestGameStorage {
	readonly values = new Map<string, string>();

	getItem(key: string) {
		return this.values.get(key) ?? null;
	}

	setItem(key: string, value: string) {
		this.values.set(key, value);
	}

	removeItem(key: string) {
		this.values.delete(key);
	}
}

function createBoard(value: number | null = null) {
	return Array.from({ length: 9 }, () => Array(9).fill(value));
}

function createState(): SavedGameState {
	const notes = Array.from({ length: 9 }, () =>
		Array.from({ length: 9 }, () => new Set<number>()),
	);
	notes[1]?.[2]?.add(7);
	notes[1]?.[2]?.add(3);

	return {
		puzzle: {
			id: "puzzle-1",
			initial: createBoard(),
			solution: createBoard(1),
			difficulty: "medium",
			score: 42,
			techniques: ["Naked Single"],
		},
		current: createBoard(),
		notes,
		timer: 123,
		actions: [
			{
				type: "addNote",
				delta: 100,
				technique: "Naked Single",
				payload: { row: 1, col: 2, value: 3 },
			},
			{ type: "undo", delta: 101 },
		],
	};
}

describe("guest game storage", () => {
	test("round-trips a versioned snapshot and restores note Sets", () => {
		const storage = new MemoryStorage();
		const state = createState();

		expect(saveGuestGameState("guest-a", state, storage, 123_456)).toBe(true);
		const snapshot = loadGuestGameState(storage);

		expect(snapshot?.version).toBe(1);
		expect(snapshot?.sourceUid).toBe("guest-a");
		expect(snapshot?.savedAt).toBe(123_456);
		expect(snapshot?.state).toEqual(state);
		expect(snapshot?.state.notes[1]?.[2]).toBeInstanceOf(Set);
	});

	test("uses one UID-independent key so a replaced guest account can recover", () => {
		const storage = new MemoryStorage();
		saveGuestGameState("old-guest-uid", createState(), storage, 1);

		expect([...storage.values.keys()]).toEqual([GUEST_GAME_STORAGE_KEY]);
		expect(loadGuestGameState(storage)?.sourceUid).toBe("old-guest-uid");
	});

	test("discards malformed JSON and invalid snapshots", () => {
		const storage = new MemoryStorage();
		storage.setItem(GUEST_GAME_STORAGE_KEY, "not-json");

		expect(loadGuestGameState(storage)).toBeNull();
		expect(storage.getItem(GUEST_GAME_STORAGE_KEY)).toBeNull();

		storage.setItem(
			GUEST_GAME_STORAGE_KEY,
			JSON.stringify({ version: 99, sourceUid: "guest", state: {} }),
		);
		expect(loadGuestGameState(storage)).toBeNull();
		expect(storage.getItem(GUEST_GAME_STORAGE_KEY)).toBeNull();
	});

	test("rejects invalid nested board and action values", () => {
		const storage = new MemoryStorage();
		saveGuestGameState("guest", createState(), storage, 1);
		const stored = JSON.parse(
			storage.getItem(GUEST_GAME_STORAGE_KEY) ?? "null",
		);
		stored.state.current[0][0] = 10;
		stored.state.actions[0].payload.row = -1;
		storage.setItem(GUEST_GAME_STORAGE_KEY, JSON.stringify(stored));

		expect(loadGuestGameState(storage)).toBeNull();
	});

	test("contains storage failures", () => {
		const failingStorage: GuestGameStorage = {
			getItem: () => {
				throw new Error("unavailable");
			},
			setItem: () => {
				throw new Error("quota");
			},
			removeItem: () => {
				throw new Error("blocked");
			},
		};

		expect(saveGuestGameState("guest", createState(), failingStorage)).toBe(
			false,
		);
		expect(loadGuestGameState(failingStorage)).toBeNull();
		expect(clearGuestGameState(failingStorage)).toBe(false);
	});

	test("does not persist invalid metadata or runtime data", () => {
		const storage = new MemoryStorage();
		const invalidState = createState();
		invalidState.notes[0] = [];

		expect(saveGuestGameState("", createState(), storage, 1)).toBe(false);
		expect(
			saveGuestGameState("guest", createState(), storage, Number.NaN),
		).toBe(false);
		expect(saveGuestGameState("guest", invalidState, storage, 1)).toBe(false);
		expect(storage.getItem(GUEST_GAME_STORAGE_KEY)).toBeNull();
	});

	test("clears the snapshot", () => {
		const storage = new MemoryStorage();
		saveGuestGameState("guest", createState(), storage);

		expect(clearGuestGameState(storage)).toBe(true);
		expect(loadGuestGameState(storage)).toBeNull();
	});
});

describe("resolveGuestGameState", () => {
	test("always prefers an existing cloud game", () => {
		const localState = createState();
		const cloudState = {
			...createState(),
			timer: 999,
			lastUpdated: Timestamp.fromMillis(2),
		};
		const localSnapshot = {
			version: 1 as const,
			sourceUid: "old-guest",
			savedAt: 1,
			state: localState,
		};

		expect(
			resolveGuestGameState(cloudState, localSnapshot, { fromCache: true }),
		).toEqual({
			state: cloudState,
			source: "cloud",
			shouldUploadLocal: false,
		});
	});

	test("does not replace a newer local save with a stale cached cloud game", () => {
		const localSnapshot = {
			version: 1 as const,
			sourceUid: "old-guest",
			savedAt: 20,
			state: createState(),
		};
		const cachedCloudState = {
			...createState(),
			timer: 5,
			lastUpdated: Timestamp.fromMillis(10),
		};

		expect(
			resolveGuestGameState(cachedCloudState, localSnapshot, {
				fromCache: true,
			}),
		).toEqual({
			state: localSnapshot.state,
			source: "local",
			shouldUploadLocal: false,
		});
	});

	test("accepts a server-authoritative cloud game over the local fallback", () => {
		const localSnapshot = {
			version: 1 as const,
			sourceUid: "old-guest",
			savedAt: 20,
			state: createState(),
		};
		const serverCloudState = {
			...createState(),
			timer: 5,
			lastUpdated: Timestamp.fromMillis(10),
		};

		expect(
			resolveGuestGameState(serverCloudState, localSnapshot, {
				fromCache: false,
			}),
		).toEqual({
			state: serverCloudState,
			source: "cloud",
			shouldUploadLocal: false,
		});
	});

	test("shows a local fallback offline without uploading it yet", () => {
		const localSnapshot = {
			version: 1 as const,
			sourceUid: "old-guest",
			savedAt: 1,
			state: createState(),
		};

		expect(
			resolveGuestGameState(null, localSnapshot, { fromCache: true }),
		).toEqual({
			state: localSnapshot.state,
			source: "local",
			shouldUploadLocal: false,
		});
	});

	test("migrates the local fallback only after a server-authoritative miss", () => {
		const localSnapshot = {
			version: 1 as const,
			sourceUid: "old-guest",
			savedAt: 1,
			state: createState(),
		};

		expect(
			resolveGuestGameState(null, localSnapshot, { fromCache: false }),
		).toEqual({
			state: localSnapshot.state,
			source: "local",
			shouldUploadLocal: true,
		});
		expect(resolveGuestGameState(null, null, { fromCache: false })).toEqual({
			state: null,
			source: "none",
			shouldUploadLocal: false,
		});
	});
});
