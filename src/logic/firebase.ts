import {
	arrayUnion,
	collection,
	doc,
	getDoc,
	getDocs,
	limit,
	onSnapshot,
	orderBy,
	query,
	setDoc,
	startAt,
	Timestamp,
	where,
} from "firebase/firestore";
import { unflattenBoard, unflattenCellNotes } from "@/lib/utils";
import { parsePuzzle } from "@/logic/sudoku";
import type {
	DBGameState,
	DBHighScore,
	DBPuzzle,
	DBUserDocument,
	Difficulty,
	GameState,
	HighScore,
	Puzzle,
	UserDocument,
} from "@/types";
import { db } from "../firebase";

const USERS_COLLECTION = "users";
const HIGHSCORES_COLLECTION = "highscores";
const PUZZLES_COLLECTION = "puzzles";

// ─── Conversion Helpers ────────────────────────────

/**
 * Converts a DBPuzzle (Firestore) to a Puzzle (runtime)
 */
export function toPuzzle(dbPuzzle: DBPuzzle): Puzzle {
	return {
		id: dbPuzzle.id,
		initial: parsePuzzle(dbPuzzle.puzzle),
		solution: parsePuzzle(dbPuzzle.solution),
		difficulty: dbPuzzle.difficulty,
		score: dbPuzzle.score,
		techniques: dbPuzzle.techniques,
	};
}

/**
 * Converts a DBHighScore (Firestore) to a HighScore (runtime)
 */
function toHighScore(dbScore: DBHighScore): HighScore {
	return {
		puzzle: {
			id: dbScore.puzzleId || "",
			initial: unflattenBoard(dbScore.initial || []),
			solution: unflattenBoard(dbScore.solution || []),
			difficulty: dbScore.difficulty,
			score: dbScore.score || 0,
			techniques: dbScore.techniques || [],
		},
		time: dbScore.time,
		date: dbScore.date,
		userId: dbScore.userId,
		userName: dbScore.userName,
		actions: dbScore.actions,
	};
}

/**
 * Converts a DBGameState (Firestore) to a GameState (runtime)
 */
function toGameState(gameData: DBGameState): Omit<GameState, "lastUpdated"> {
	return {
		puzzle: {
			id: gameData.puzzleId,
			initial: unflattenBoard(gameData.initial),
			solution: unflattenBoard(gameData.solution),
			difficulty: gameData.difficulty,
			score: gameData.score,
			techniques: gameData.techniques,
		},
		current: unflattenBoard(gameData.current),
		notes: unflattenCellNotes(gameData.notes),
		timer: gameData.timer,
		actions: gameData.actions || [],
	};
}

// ─── Game State ────────────────────────────────────

/**
 * Saves the current game state for persistence
 */
export async function saveGameState(
	userId: string,
	state: Omit<GameState, "lastUpdated">,
) {
	const stateRef = doc(db, USERS_COLLECTION, userId, "state", "current");

	// Convert notes to an object with keys "0" to "80" to avoid nested arrays
	const notesObj: Record<string, number[]> = {};
	state.notes.flat().forEach((cell, i) => {
		if (cell.size > 0) {
			notesObj[i.toString()] = Array.from(cell);
		}
	});

	const dbState: Omit<DBGameState, "lastUpdated"> & {
		lastUpdated: ReturnType<typeof Timestamp.now>;
	} = {
		puzzleId: state.puzzle.id,
		initial: state.puzzle.initial.flat(),
		current: state.current.flat(),
		solution: state.puzzle.solution.flat(),
		difficulty: state.puzzle.difficulty,
		score: state.puzzle.score,
		techniques: state.puzzle.techniques,
		timer: state.timer,
		notes: notesObj,
		actions: state.actions,
		lastUpdated: Timestamp.now(),
	};

	await setDoc(stateRef, dbState);
}

/**
 * Loads a saved game state
 */
export async function loadGameState(
	userId: string,
): Promise<Omit<GameState, "lastUpdated"> | null> {
	const stateRef = doc(db, USERS_COLLECTION, userId, "state", "current");
	const stateSnap = await getDoc(stateRef);

	if (stateSnap.exists()) {
		const data = stateSnap.data() as DBGameState;
		return toGameState(data);
	}
	return null;
}

/**
 * Subscribes to changes in the user document
 */
export function subscribeToUser(
	userId: string,
	callback: (data: UserDocument) => void,
) {
	return onSnapshot(doc(db, USERS_COLLECTION, userId), (doc) => {
		if (doc.exists()) {
			const data = doc.data() as DBUserDocument;
			const gameState = data.gameState ? toGameState(data.gameState) : null;
			const parsedData: UserDocument = {
				...data,
				gameState,
			};
			callback(parsedData);
		} else {
			callback({
				settings: { theme: "default" },
				gameState: null,
				playedPuzzles: [],
			});
		}
	});
}

/**
 * Updates user settings
 */
export async function updateUserSettings(
	userId: string,
	settings: Partial<UserDocument["settings"]>,
) {
	const userRef = doc(db, USERS_COLLECTION, userId);
	await setDoc(userRef, { settings }, { merge: true });
}

// ─── High Scores ───────────────────────────────────

/**
 * Saves a high score
 */
export async function saveHighScore(score: HighScore) {
	const scoreRef = doc(collection(db, HIGHSCORES_COLLECTION));
	const dbScore: DBHighScore = {
		difficulty: score.puzzle.difficulty,
		time: score.time,
		date: score.date,
		userId: score.userId,
		userName: score.userName,
		initial: score.puzzle.initial.flat(),
		solution: score.puzzle.solution.flat(),
		actions: score.actions,
		puzzleId: score.puzzle.id,
		score: score.puzzle.score,
		techniques: score.puzzle.techniques,
	};
	await setDoc(scoreRef, dbScore);
}

/**
 * Subscribes to high scores for a specific user
 */
export function subscribeToUserScores(
	userId: string,
	callback: (scores: HighScore[]) => void,
) {
	const q = query(
		collection(db, HIGHSCORES_COLLECTION),
		where("userId", "==", userId),
	);

	return onSnapshot(q, (snapshot) => {
		const scores = snapshot.docs.map((doc) =>
			toHighScore(doc.data() as DBHighScore),
		);
		callback(scores);
	});
}

/**
 * Fetches user's scores for a specific difficulty (legacy, kept for compatibility if needed)
 */
export async function getUserScores(
	userId: string,
	difficulty: Difficulty,
): Promise<HighScore[]> {
	const q = query(
		collection(db, HIGHSCORES_COLLECTION),
		where("userId", "==", userId),
		where("difficulty", "==", difficulty),
	);

	const querySnapshot = await getDocs(q);
	return querySnapshot.docs
		.map((doc) => toHighScore(doc.data() as DBHighScore))
		.sort((a, b) => a.time - b.time);
}

// ─── Puzzle Management ─────────────────────────────

/**
 * Marks a puzzle as played for a user
 */
export async function markPuzzleAsPlayed(userId: string, puzzleId: string) {
	const userRef = doc(db, USERS_COLLECTION, userId);
	await setDoc(
		userRef,
		{ playedPuzzles: arrayUnion(puzzleId) },
		{ merge: true },
	);
}

/**
 * Fetches a random puzzle of a given difficulty from Firestore
 */
export async function getRandomPuzzle(
	difficulty: Difficulty,
	playedPuzzleIds: string[] = [],
): Promise<Puzzle> {
	const puzzlesRef = collection(db, PUZZLES_COLLECTION);
	const playedSet = new Set(playedPuzzleIds);
	const MAX_RETRIES = 3;
	const BATCH_SIZE = 5;

	for (let i = 0; i < MAX_RETRIES; i++) {
		const randomHash = Math.random().toString(16).slice(2, 14).padEnd(12, "0");

		let q = query(
			puzzlesRef,
			where("difficulty", "==", difficulty),
			orderBy("__name__"),
			startAt(randomHash),
			limit(BATCH_SIZE),
		);

		let querySnapshot = await getDocs(q);

		if (querySnapshot.empty) {
			q = query(
				puzzlesRef,
				where("difficulty", "==", difficulty),
				orderBy("__name__"),
				limit(BATCH_SIZE),
			);
			querySnapshot = await getDocs(q);
		}

		if (querySnapshot.empty) {
			throw new Error(`No puzzles found for difficulty: ${difficulty}`);
		}

		for (const docSnapshot of querySnapshot.docs) {
			if (!playedSet.has(docSnapshot.id)) {
				const data = docSnapshot.data() as DBPuzzle;
				return toPuzzle({ ...data, id: docSnapshot.id });
			}
		}
	}

	console.warn(
		"Could not find unplayed puzzle after retries, returning a played one.",
	);
	const fallbackQuery = query(
		puzzlesRef,
		where("difficulty", "==", difficulty),
		limit(1),
	);
	const fallbackSnap = await getDocs(fallbackQuery);
	if (!fallbackSnap.empty) {
		const docSnapshot = fallbackSnap.docs[0];
		if (docSnapshot) {
			const data = docSnapshot.data() as DBPuzzle;
			return toPuzzle({ ...data, id: docSnapshot.id });
		}
	}

	throw new Error(`No puzzles found for difficulty: ${difficulty}`);
}
