type DatedScore = {
	date: {
		toMillis: () => number;
	};
};

/** Returns a new array with the most recently completed game first. */
export const sortScoresNewestFirst = <T extends DatedScore>(
	scores: readonly T[],
): T[] => [...scores].sort((a, b) => b.date.toMillis() - a.date.toMillis());
