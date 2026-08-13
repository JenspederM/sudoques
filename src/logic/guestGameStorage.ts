import type {
	Board,
	CellNotes,
	Difficulty,
	GameAction,
	GameState,
	Puzzle,
} from "@/types";

export const GUEST_GAME_STORAGE_KEY = "sudoques:guest-game:v1";

const SNAPSHOT_VERSION = 1 as const;
const BOARD_SIZE = 9;
const DIFFICULTIES: ReadonlySet<Difficulty> = new Set([
	"easy",
	"normal",
	"medium",
	"hard",
	"expert",
	"master",
]);

type SavedGameState = Omit<GameState, "lastUpdated">;
type SerializedNotes = number[][][];

type SerializedGameState = Omit<SavedGameState, "notes"> & {
	notes: SerializedNotes;
};

type SerializedGuestGameSnapshot = {
	version: typeof SNAPSHOT_VERSION;
	sourceUid: string;
	savedAt: number;
	state: SerializedGameState;
};

/** The small localStorage surface used by the guest-game fallback. */
export type GuestGameStorage = Pick<
	Storage,
	"getItem" | "setItem" | "removeItem"
>;

/** A validated snapshot. `notes` have already been restored as Sets. */
export type GuestGameSnapshot = {
	version: typeof SNAPSHOT_VERSION;
	sourceUid: string;
	savedAt: number;
	state: SavedGameState;
};

export type GuestGameResolution = {
	state: SavedGameState | GameState | null;
	source: "cloud" | "local" | "none";
	shouldUploadLocal: boolean;
};

function getBrowserStorage(): GuestGameStorage | null {
	try {
		return typeof window === "undefined" ? null : window.localStorage;
	} catch {
		return null;
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
	return typeof value === "number" && Number.isFinite(value);
}

function isCellValue(value: unknown): value is number | null {
	return (
		value === null ||
		(typeof value === "number" &&
			Number.isInteger(value) &&
			value >= 1 &&
			value <= 9)
	);
}

function parseBoard(value: unknown): Board | null {
	if (!Array.isArray(value) || value.length !== BOARD_SIZE) return null;

	const board: Board = [];
	for (const candidateRow of value) {
		if (!Array.isArray(candidateRow) || candidateRow.length !== BOARD_SIZE) {
			return null;
		}
		if (!candidateRow.every(isCellValue)) return null;
		board.push([...candidateRow]);
	}

	return board;
}

function parseNotes(value: unknown): CellNotes | null {
	if (!Array.isArray(value) || value.length !== BOARD_SIZE) return null;

	const notes: CellNotes = [];
	for (const candidateRow of value) {
		if (!Array.isArray(candidateRow) || candidateRow.length !== BOARD_SIZE) {
			return null;
		}

		const row: Set<number>[] = [];
		for (const candidateCell of candidateRow) {
			if (
				!Array.isArray(candidateCell) ||
				!candidateCell.every(
					(note) =>
						typeof note === "number" &&
						Number.isInteger(note) &&
						note >= 1 &&
						note <= 9,
				)
			) {
				return null;
			}
			row.push(new Set(candidateCell));
		}
		notes.push(row);
	}

	return notes;
}

function parsePuzzle(value: unknown): Puzzle | null {
	if (!isRecord(value)) return null;

	const initial = parseBoard(value.initial);
	const solution = parseBoard(value.solution);
	if (
		typeof value.id !== "string" ||
		value.id.length === 0 ||
		!initial ||
		!solution ||
		typeof value.difficulty !== "string" ||
		!DIFFICULTIES.has(value.difficulty as Difficulty) ||
		!isFiniteNumber(value.score) ||
		!Array.isArray(value.techniques) ||
		!value.techniques.every((technique) => typeof technique === "string")
	) {
		return null;
	}

	return {
		id: value.id,
		initial,
		solution,
		difficulty: value.difficulty as Difficulty,
		score: value.score,
		techniques: [...value.techniques],
	};
}

function isCellIndex(value: unknown): value is number {
	return (
		typeof value === "number" &&
		Number.isInteger(value) &&
		value >= 0 &&
		value < BOARD_SIZE
	);
}

function parseAction(value: unknown): GameAction | null {
	if (
		!isRecord(value) ||
		typeof value.type !== "string" ||
		!isFiniteNumber(value.delta)
	) {
		return null;
	}

	const technique = value.technique;
	if (technique !== undefined && typeof technique !== "string") return null;
	const common = technique === undefined ? {} : { technique };

	if (value.type === "undo" || value.type === "redo") {
		return { type: value.type, delta: value.delta };
	}

	if (!isRecord(value.payload)) return null;
	const { row, col, value: cellValue } = value.payload;
	if (!isCellIndex(row) || !isCellIndex(col)) return null;

	if (value.type === "removeValue") {
		return {
			type: value.type,
			delta: value.delta,
			...common,
			payload: { row, col },
		};
	}

	if (
		(value.type === "addValue" ||
			value.type === "addNote" ||
			value.type === "removeNote") &&
		typeof cellValue === "number" &&
		Number.isInteger(cellValue) &&
		cellValue >= 1 &&
		cellValue <= 9
	) {
		return {
			type: value.type,
			delta: value.delta,
			...common,
			payload: { row, col, value: cellValue },
		};
	}

	return null;
}

function parseState(value: unknown): SavedGameState | null {
	if (!isRecord(value)) return null;

	const puzzle = parsePuzzle(value.puzzle);
	const current = parseBoard(value.current);
	const notes = parseNotes(value.notes);
	if (
		!puzzle ||
		!current ||
		!notes ||
		!isFiniteNumber(value.timer) ||
		value.timer < 0 ||
		!Array.isArray(value.actions)
	) {
		return null;
	}

	const actions: GameAction[] = [];
	for (const candidateAction of value.actions) {
		const action = parseAction(candidateAction);
		if (!action) return null;
		actions.push(action);
	}

	return {
		puzzle,
		current,
		notes,
		timer: value.timer,
		actions,
	};
}

function parseSnapshot(value: unknown): GuestGameSnapshot | null {
	if (
		!isRecord(value) ||
		value.version !== SNAPSHOT_VERSION ||
		typeof value.sourceUid !== "string" ||
		value.sourceUid.length === 0 ||
		!isFiniteNumber(value.savedAt) ||
		value.savedAt < 0
	) {
		return null;
	}

	const state = parseState(value.state);
	if (!state) return null;

	return {
		version: SNAPSHOT_VERSION,
		sourceUid: value.sourceUid,
		savedAt: value.savedAt,
		state,
	};
}

function serializeState(state: SavedGameState): SerializedGameState {
	return {
		...state,
		notes: state.notes.map((row) =>
			row.map((cell) => Array.from(cell).sort((a, b) => a - b)),
		),
	};
}

/** Save one device-local guest game. The key intentionally does not contain a UID. */
export function saveGuestGameState(
	sourceUid: string,
	state: SavedGameState,
	storage: GuestGameStorage | null = getBrowserStorage(),
	savedAt = Date.now(),
): boolean {
	if (
		!storage ||
		sourceUid.length === 0 ||
		!Number.isFinite(savedAt) ||
		savedAt < 0
	) {
		return false;
	}

	try {
		const snapshot: SerializedGuestGameSnapshot = {
			version: SNAPSHOT_VERSION,
			sourceUid,
			savedAt,
			state: serializeState(state),
		};
		if (!parseSnapshot(snapshot)) return false;

		storage.setItem(GUEST_GAME_STORAGE_KEY, JSON.stringify(snapshot));
		return true;
	} catch {
		return false;
	}
}

/** Load and validate a device-local guest game. Invalid data is discarded. */
export function loadGuestGameState(
	storage: GuestGameStorage | null = getBrowserStorage(),
): GuestGameSnapshot | null {
	if (!storage) return null;

	try {
		const serialized = storage.getItem(GUEST_GAME_STORAGE_KEY);
		if (serialized === null) return null;

		const snapshot = parseSnapshot(JSON.parse(serialized));
		if (snapshot) return snapshot;

		clearGuestGameState(storage);
		return null;
	} catch {
		clearGuestGameState(storage);
		return null;
	}
}

/** Clear the local fallback without allowing storage errors to escape. */
export function clearGuestGameState(
	storage: GuestGameStorage | null = getBrowserStorage(),
): boolean {
	if (!storage) return false;

	try {
		storage.removeItem(GUEST_GAME_STORAGE_KEY);
		return true;
	} catch {
		return false;
	}
}

/**
 * Resolve the initial game shown to the player.
 *
 * A server-confirmed cloud game is authoritative. A local guest snapshot stays
 * visible if the only cloud copy is an older cache entry, and it is migrated to
 * the current UID only after Firestore confirms there is no server copy.
 */
export function resolveGuestGameState(
	cloudState: GameState | null,
	localSnapshot: GuestGameSnapshot | null,
	metadata: { fromCache: boolean },
): GuestGameResolution {
	if (cloudState) {
		const cloudSavedAt = cloudState.lastUpdated?.toMillis?.() ?? 0;
		if (
			localSnapshot &&
			metadata.fromCache &&
			localSnapshot.savedAt > cloudSavedAt
		) {
			return {
				state: localSnapshot.state,
				source: "local",
				shouldUploadLocal: false,
			};
		}

		return {
			state: cloudState,
			source: "cloud",
			shouldUploadLocal: false,
		};
	}

	if (localSnapshot) {
		return {
			state: localSnapshot.state,
			source: "local",
			shouldUploadLocal: !metadata.fromCache,
		};
	}

	return { state: null, source: "none", shouldUploadLocal: false };
}
