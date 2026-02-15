import type { Timestamp } from "firebase/firestore";

export type Difficulty = "25" | "27" | "30" | "35" | "40" | "45";
export type Board = (number | null)[][];
export type CellNotes = Set<number>[][];
export type DBCellNotes = Record<string, number[]>;
export type DBBoard = (number | null)[];

export type GameState = {
	initial: Board;
	current: Board;
	notes: CellNotes;
	solution: Board;
	timer: number;
	lastUpdated: Timestamp;
};

export type UserDocument = {
	settings: {
		theme: string;
	};
	gameState: GameState | null;
};

export type DBGameState = {
	initial: DBBoard;
	current: DBBoard;
	solution: DBBoard;
	timer: number;
	notes: DBCellNotes;
	lastUpdated: Timestamp;
};

export type DBUserDocument = {
	settings: {
		theme: string;
	};
	gameState: DBGameState | null;
};

export type HighScore = {
	difficulty: string;
	time: number;
	date: Timestamp;
	userId: string;
	userName?: string;
	initial?: DBBoard;
	solution?: DBBoard;
};
