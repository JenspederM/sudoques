import {
	collection,
	doc,
	getDoc,
	getDocs,
	limit,
	orderBy,
	query,
	setDoc,
	Timestamp,
	where,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Board, CellNotes } from "./sudoku";

export interface GameState {
	initial: Board;
	current: Board;
	notes: CellNotes;
	solution: Board;
	timer: number;
	lastUpdated: Timestamp;
}

export interface HighScore {
	difficulty: string;
	time: number;
	date: Timestamp;
	userId: string;
	userName?: string;
	initial?: (number | null)[];
	solution?: (number | null)[];
}

const GAMES_COLLECTION = "games";
const HIGHSCORES_COLLECTION = "highscores";

/**
 * Saves the current game state for anonymous persistence
 */
export async function saveGameState(
	userId: string,
	state: Omit<GameState, "lastUpdated">,
) {
	const gameRef = doc(db, GAMES_COLLECTION, userId);

	// Convert notes to an object with keys "0" to "80" to avoid nested arrays
	const notesObj: Record<string, number[]> = {};
	state.notes.flat().forEach((cell, i) => {
		if (cell.size > 0) {
			notesObj[i.toString()] = Array.from(cell);
		}
	});

	await setDoc(gameRef, {
		initial: state.initial.flat(),
		current: state.current.flat(),
		solution: state.solution.flat(),
		timer: state.timer,
		notes: notesObj,
		lastUpdated: Timestamp.now(),
	});
}

/**
 * Loads a saved game state
 */
export async function loadGameState(
	userId: string,
): Promise<Omit<GameState, "lastUpdated"> | null> {
	const gameRef = doc(db, GAMES_COLLECTION, userId);
	const gameSnap = await getDoc(gameRef);

	if (gameSnap.exists()) {
		const data = gameSnap.data();

		// Helper to unflatten 1D array back to 9x9
		const unflatten = <T>(arr: T[]): T[][] => {
			const result: T[][] = [];
			for (let i = 0; i < 9; i++) {
				result.push(arr.slice(i * 9, (i + 1) * 9));
			}
			return result;
		};

		// Reconstruct notes from object
		const notesArray: Set<number>[] = Array.from(
			{ length: 81 },
			() => new Set(),
		);
		const notesData = data.notes as Record<string, number[]>;
		for (const [key, values] of Object.entries(notesData)) {
			const idx = parseInt(key, 10);
			if (idx >= 0 && idx < 81) {
				notesArray[idx] = new Set(values);
			}
		}

		return {
			initial: unflatten(data.initial),
			current: unflatten(data.current),
			solution: unflatten(data.solution),
			timer: data.timer,
			notes: unflatten(notesArray) as CellNotes,
		};
	}
	return null;
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
		orderBy("time", "asc"),
	);

	const querySnapshot = await getDocs(q);
	return querySnapshot.docs
		.map((doc) => doc.data() as HighScore)
		.filter((score) => score.difficulty === difficulty);
}
