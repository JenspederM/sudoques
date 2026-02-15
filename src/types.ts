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
	actions: GameAction[];
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
	actions: GameAction[];
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
	actions?: GameAction[];
};

export type AddValueAction = {
	type: "addValue";
	payload: {
		row: number;
		col: number;
		value: number;
	};
};

export type RemoveValueAction = {
	type: "removeValue";
	payload: {
		row: number;
		col: number;
	};
};

export type AddNoteAction = {
	type: "addNote";
	payload: {
		row: number;
		col: number;
		value: number;
	};
};

export type RemoveNoteAction = {
	type: "removeNote";
	payload: {
		row: number;
		col: number;
		value: number;
	};
};

export type UndoAction = {
	type: "undo";
};

export type RedoAction = {
	type: "redo";
};

export type GameAction =
	| AddValueAction
	| RemoveValueAction
	| AddNoteAction
	| RemoveNoteAction
	| UndoAction
	| RedoAction;
