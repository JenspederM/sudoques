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
import type {
	CellNotes,
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
			lastUpdated: Timestamp.now(),
		},
	});
}

/**
 * Loads a saved game state
 */
/**
 * Helper to parse raw firestore data into GameState
 */
function parseGameState(
	gameData: DBGameState | null,
): Omit<GameState, "lastUpdated"> | null {
	if (!gameData) return null;

	// Helper to unflatten 1D array back to 9x9
	const unflatten = <T>(arr: T[]): T[][] => {
		const result: T[][] = [];
		for (let i = 0; i < 9; i++) {
			result.push(arr.slice(i * 9, (i + 1) * 9));
		}
		return result;
	};

	// Reconstruct notes from object
	const notesArray: Set<number>[] = Array.from({ length: 81 }, () => new Set());

	// Check if notes exist and are in the expected format
	const notesData = gameData.notes;

	if (notesData) {
		for (const [key, values] of Object.entries(notesData)) {
			const idx = parseInt(key, 10);
			if (idx >= 0 && idx < 81) {
				notesArray[idx] = new Set(values);
			}
		}
	}

	return {
		initial: unflatten(gameData.initial),
		current: unflatten(gameData.current),
		solution: unflatten(gameData.solution),
		timer: gameData.timer,
		notes: unflatten(notesArray) as CellNotes,
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
 * Fetches top 10 high scores for a specific difficulty
 */
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
