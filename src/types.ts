import type { Timestamp } from "firebase/firestore";

export type Difficulty =
	| "easy"
	| "normal"
	| "medium"
	| "hard"
	| "expert"
	| "master";
export type LabelledDifficulty = {
	id: Difficulty;
	label: string;
	desc: string;
};
export type Board = (number | null)[][];
export type CellNotes = Set<number>[][];
export type DBCellNotes = Record<string, number[]>;
export type DBBoard = (number | null)[];

// ─── Puzzle ────────────────────────────────────────
export type Puzzle = {
	id: string;
	initial: Board;
	solution: Board;
	difficulty: Difficulty;
	score: number;
	techniques: string[];
};

export type DBPuzzle = {
	id: string;
	puzzle: string;
	solution: string;
	difficulty: Difficulty;
	score: number;
	techniques: string[];
	updatedAt: Timestamp;
};

// ─── Game State ────────────────────────────────────
export type GameState = {
	puzzle: Puzzle;
	current: Board;
	notes: CellNotes;
	timer: number;
	actions: GameAction[];
	lastUpdated: Timestamp;
};

export type DBGameState = {
	puzzleId: string;
	initial: DBBoard;
	current: DBBoard;
	solution: DBBoard;
	difficulty: Difficulty;
	score: number;
	techniques: string[];
	timer: number;
	notes: DBCellNotes;
	actions: GameAction[];
	lastUpdated: Timestamp;
};

// ─── User Document ─────────────────────────────────
export type UserDocument = {
	settings: {
		theme: string;
	};
	gameState: Omit<GameState, "lastUpdated"> | null;
	playedPuzzles?: string[];
};

export type DBUserDocument = {
	settings: {
		theme: string;
	};
	gameState: DBGameState | null;
	playedPuzzles?: string[];
};

// ─── High Score ────────────────────────────────────
export type HighScore = {
	puzzle: Puzzle;
	time: number;
	date: Timestamp;
	userId: string;
	userName?: string;
	actions?: GameAction[];
};

export type DBHighScore = {
	difficulty: Difficulty;
	time: number;
	date: Timestamp;
	userId: string;
	userName?: string;
	initial?: DBBoard;
	solution?: DBBoard;
	actions?: GameAction[];
	puzzleId?: string;
	score?: number;
	techniques?: string[];
};

// ─── Game Actions ──────────────────────────────────
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
