import {
	collection,
	doc,
	getDoc,
	getDocs,
	onSnapshot,
	query,
	setDoc,
	Timestamp,
	updateDoc,
	where,
} from "firebase/firestore";
import { unflattenBoard, unflattenCellNotes } from "@/lib/utils";
import type {
	DBGameState,
	DBUserDocument,
	GameState,
	HighScore,
	UserDocument,
} from "@/types";
import { db } from "../firebase";

const USERS_COLLECTION = "users";
const HIGHSCORES_COLLECTION = "highscores";

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
	await updateDoc(userRef, {
		gameState: {
			initial: state.initial.flat(),
			current: state.current.flat(),
			solution: state.solution.flat(),
			timer: state.timer,
			notes: notesObj,
			actions: state.actions,
			lastUpdated: Timestamp.now(),
		},
	});
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
	await updateDoc(userRef, {
		settings,
	});
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
