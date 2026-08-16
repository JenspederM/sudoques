import { isBoardComplete } from "@/logic/sudoku";
import type { GameState } from "@/types";

export type AuthHydrationStatus =
	| "loading"
	| "authenticated"
	| "unauthenticated";

export type SavedGameHydrationStatus =
	| "loading"
	| "provisional"
	| "none"
	| "unfinished"
	| "completed";

export type InitialGameResumeDecision = "wait" | "resume" | "stay";

type SavedGame = Omit<GameState, "lastUpdated">;

interface InitialGameResumeInput {
	initialPathname: string;
	currentPathname: string;
	hasHandledInitialResume: boolean;
	authStatus: AuthHydrationStatus;
	gameStatus: SavedGameHydrationStatus;
}

/** Classifies the persisted game after its initial snapshot has loaded. */
export function getSavedGameHydrationStatus(
	gameState: SavedGame | null,
	isLoading: boolean,
	isAuthoritative: boolean,
): SavedGameHydrationStatus {
	if (isLoading) return "loading";

	// An unfinished cached game is useful immediately, but an empty or finished
	// cache entry is not proof that the server has no active game.
	if (
		gameState &&
		!isBoardComplete(gameState.current, gameState.puzzle.solution)
	) {
		return "unfinished";
	}
	if (!isAuthoritative) return "provisional";
	if (!gameState) return "none";

	return "completed";
}

/**
 * Resolves the one-time launch redirect. Later visits to Home are deliberately
 * ignored, so the game's Back button cannot create a redirect loop.
 */
export function decideInitialGameResume({
	initialPathname,
	currentPathname,
	hasHandledInitialResume,
	authStatus,
	gameStatus,
}: InitialGameResumeInput): InitialGameResumeDecision {
	if (
		hasHandledInitialResume ||
		initialPathname !== "/" ||
		currentPathname !== initialPathname
	) {
		return "stay";
	}

	if (authStatus === "loading") return "wait";
	if (authStatus === "unauthenticated") return "stay";
	if (gameStatus === "loading" || gameStatus === "provisional") return "wait";

	return gameStatus === "unfinished" ? "resume" : "stay";
}
