export type AccountScoresState<T> = {
	userId: string | null;
	scores: T[];
	isLoading: boolean;
	isUnavailable: boolean;
};

export type VisibleScores<T> = Pick<
	AccountScoresState<T>,
	"scores" | "isLoading" | "isUnavailable"
>;

export type ScoresLoadResult<T> =
	| { type: "loaded"; scores: T[] }
	| { type: "failed" };

/**
 * Settles a score listener only when it still belongs to the active account.
 * This keeps late success and error callbacks from a previous UID from
 * replacing the current account's loading state.
 */
export function settleScoresForUser<T>(
	current: AccountScoresState<T>,
	activeUserId: string | null,
	sourceUserId: string,
	result: ScoresLoadResult<T>,
): AccountScoresState<T> {
	if (activeUserId !== sourceUserId) return current;

	return {
		userId: sourceUserId,
		scores: result.type === "loaded" ? result.scores : [],
		isLoading: false,
		isUnavailable: result.type === "failed",
	};
}

export function resolveScoresForUser<T>(
	snapshot: AccountScoresState<T>,
	activeUserId: string | null,
): VisibleScores<T> {
	if (activeUserId === null) {
		return { scores: [], isLoading: false, isUnavailable: false };
	}

	if (snapshot.userId !== activeUserId) {
		return { scores: [], isLoading: true, isUnavailable: false };
	}

	return {
		scores: snapshot.scores,
		isLoading: snapshot.isLoading,
		isUnavailable: snapshot.isUnavailable,
	};
}
