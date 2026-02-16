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
import type {
	DBGameState,
	DBPuzzle,
	DBUserDocument,
	GameState,
	HighScore,
	UserDocument,
} from "@/types";
import { db } from "../firebase";

const USERS_COLLECTION = "users";
const HIGHSCORES_COLLECTION = "highscores";
const PUZZLES_COLLECTION = "puzzles";

/**
 * Saves the current game state for anonymous persistence
 */
export async function saveGameState(
	userId: string,
	state: Omit<GameState, "lastUpdated">,
) {
	const userRef = doc(db, USERS_COLLECTION, userId);

	// Convert notes to an object with keys "0" to "80" to avoid nested arrays
	const notesObj: Record<string, number[]> = {};
	state.notes.flat().forEach((cell, i) => {
		if (cell.size > 0) {
			notesObj[i.toString()] = Array.from(cell);
		}
	});

	// We use setDoc with merge: true to avoid overwriting settings if they exist
	await setDoc(
		userRef,
		{
			gameState: {
				initial: state.initial.flat(),
				current: state.current.flat(),
				solution: state.solution.flat(),
				timer: state.timer,
				notes: notesObj,
				actions: state.actions,
				lastUpdated: Timestamp.now(),
				puzzleId: state.puzzleId,
			},
		},
		{ merge: true },
	);
}

/**
 * Helper to parse raw firestore data into GameState
 */
function parseGameState(
	gameData: DBGameState | null,
): Omit<GameState, "lastUpdated"> | null {
	if (!gameData) return null;

	return {
		initial: unflattenBoard(gameData.initial),
		current: unflattenBoard(gameData.current),
		solution: unflattenBoard(gameData.solution),
		notes: unflattenCellNotes(gameData.notes),
		timer: gameData.timer,
		actions: gameData.actions || [],
		puzzleId: gameData.puzzleId,
	};
}

/**
 * Loads a saved game state
 */
export async function loadGameState(
	userId: string,
): Promise<Omit<GameState, "lastUpdated"> | null> {
	const userRef = doc(db, USERS_COLLECTION, userId);
	const userSnap = await getDoc(userRef);

	if (userSnap.exists()) {
		const data = userSnap.data() as DBUserDocument;
		return parseGameState(data.gameState);
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
			// Manually parse gameState to unflatten arrays
			const parsedData: UserDocument = {
				...data,
				gameState: parseGameState(data.gameState) as GameState,
			};
			callback(parsedData);
		} else {
			// If document doesn't exist, call with defaults
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
	await setDoc(
		userRef,
		{
			settings,
		},
		{ merge: true },
	);
}

/**
 * Saves a high score
 */
export async function saveHighScore(score: HighScore) {
	const scoreRef = doc(collection(db, HIGHSCORES_COLLECTION));
	await setDoc(scoreRef, score);
}

/**
 * Fetches user's scores for a specific difficulty
 */
export async function getUserScores(
	userId: string,
	difficulty: string,
): Promise<HighScore[]> {
	const q = query(
		collection(db, HIGHSCORES_COLLECTION),
		where("userId", "==", userId),
	);

	const querySnapshot = await getDocs(q);
	return querySnapshot.docs
		.map((doc) => doc.data() as HighScore)
		.filter((score) => score.difficulty === difficulty)
		.sort((a, b) => a.time - b.time);
}

/**
 * Marks a puzzle as played for a user
 */
export async function markPuzzleAsPlayed(userId: string, puzzleId: string) {
	const userRef = doc(db, USERS_COLLECTION, userId);
	await setDoc(
		userRef,
		{
			playedPuzzles: arrayUnion(puzzleId),
		},
		{ merge: true },
	);
}

/**
 * Fetches a random puzzle of a given difficulty from Firestore
 */
export async function getRandomPuzzle(
	difficulty: string,
	playedPuzzleIds: string[] = [],
): Promise<DBPuzzle> {
	const puzzlesRef = collection(db, PUZZLES_COLLECTION);
	const playedSet = new Set(playedPuzzleIds);
	const MAX_RETRIES = 5;
	const BATCH_SIZE = 10;

	for (let i = 0; i < MAX_RETRIES; i++) {
		// Pick a random starting point
		const randomHash = Math.random().toString(16).slice(2, 14).padEnd(12, "0");

		// Fetch a batch starting from randomHash
		let q = query(
			puzzlesRef,
			where("difficulty", "==", difficulty),
			orderBy("__name__"),
			startAt(randomHash),
			limit(BATCH_SIZE),
		);

		let querySnapshot = await getDocs(q);

		// Wrap around if empty
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

		// Find a puzzle not in playedSet
		for (const docSnapshot of querySnapshot.docs) {
			if (!playedSet.has(docSnapshot.id)) {
				const data = docSnapshot.data() as DBPuzzle;
				return {
					id: docSnapshot.id,
					puzzle: data.puzzle,
					solution: data.solution,
					difficulty: data.difficulty,
					score: data.score,
					techniques: data.techniques,
					updatedAt: data.updatedAt,
				};
			}
		}
		// If all in batch are played, retry new random point
	}

	// If we exhausted retries, just return the first one found (fallback)
	// This prevents infinite loops if user played ALL puzzles (unlikely with 100k, but possible)
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
			return {
				id: docSnapshot.id,
				puzzle: data.puzzle,
				solution: data.solution,
				difficulty: data.difficulty,
				score: data.score,
				techniques: data.techniques,
				updatedAt: data.updatedAt,
			};
		}
	}

	throw new Error(`No puzzles found for difficulty: ${difficulty}`);
}
