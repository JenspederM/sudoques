import type { Timestamp } from "firebase/firestore";

export type Difficulty =
	| "easy"
	| "normal"
	| "medium"
	| "hard"
	| "expert"
	| "master";
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
	delta: number;
	payload: {
		row: number;
		col: number;
		value: number;
	};
};

export type RemoveValueAction = {
	type: "removeValue";
	delta: number;
	payload: {
		row: number;
		col: number;
	};
};

export type AddNoteAction = {
	type: "addNote";
	delta: number;
	payload: {
		row: number;
		col: number;
		value: number;
	};
};

export type RemoveNoteAction = {
	type: "removeNote";
	delta: number;
	payload: {
		row: number;
		col: number;
		value: number;
	};
};

export type UndoAction = {
	type: "undo";
	delta: number;
};

export type RedoAction = {
	type: "redo";
	delta: number;
};

export type GameAction =
	| AddValueAction
	| RemoveValueAction
	| AddNoteAction
	| RemoveNoteAction
	| UndoAction
	| RedoAction;
