type PuzzleCandidate = {
	id: string;
};

export type PuzzleHistorySession = {
	userId: string | null;
	puzzleIds: Set<string>;
};

export function isPuzzleHistoryHydrated(
	activeUserId: string | null,
	hydratedUserId: string | null,
	isLoaded: boolean,
): boolean {
	return activeUserId === null || (activeUserId === hydratedUserId && isLoaded);
}

export function syncPuzzleHistorySession(
	session: PuzzleHistorySession,
	activeUserId: string | null,
	hydratedPuzzleIds: readonly string[],
): PuzzleHistorySession {
	if (session.userId !== activeUserId) {
		return {
			userId: activeUserId,
			puzzleIds: new Set(hydratedPuzzleIds),
		};
	}

	return {
		userId: activeUserId,
		puzzleIds: new Set([...session.puzzleIds, ...hydratedPuzzleIds]),
	};
}

export function createPuzzleCursor(random: () => number = Math.random): string {
	const value = Math.min(Math.max(random(), 0), 1 - Number.EPSILON);
	return Math.floor(value * 16 ** 12)
		.toString(16)
		.padStart(12, "0");
}

export function mergePuzzleCandidates<T extends PuzzleCandidate>(
	...candidateGroups: ReadonlyArray<readonly T[]>
): T[] {
	const uniqueCandidates = new Map<string, T>();
	for (const group of candidateGroups) {
		for (const candidate of group) {
			if (!uniqueCandidates.has(candidate.id)) {
				uniqueCandidates.set(candidate.id, candidate);
			}
		}
	}
	return Array.from(uniqueCandidates.values());
}

function pickRandom<T>(
	candidates: readonly T[],
	random: () => number,
): T | null {
	if (candidates.length === 0) return null;
	const value = Math.min(Math.max(random(), 0), 1 - Number.EPSILON);
	return candidates[Math.floor(value * candidates.length)] ?? null;
}

export function pickUnseenPuzzle<T extends PuzzleCandidate>(
	candidates: readonly T[],
	seenPuzzleIds: ReadonlySet<string>,
	random: () => number = Math.random,
): T | null {
	return pickRandom(
		candidates.filter((candidate) => !seenPuzzleIds.has(candidate.id)),
		random,
	);
}

export function pickPuzzleAfterHistoryIsExhausted<T extends PuzzleCandidate>(
	candidates: readonly T[],
	currentPuzzleId?: string,
	random: () => number = Math.random,
): T | null {
	const alternatives = currentPuzzleId
		? candidates.filter((candidate) => candidate.id !== currentPuzzleId)
		: candidates;
	return pickRandom(
		alternatives.length > 0 ? alternatives : candidates,
		random,
	);
}

export type CatalogSelection<T> = {
	candidate: T | null;
	reused: boolean;
};

/**
 * Selects from every candidate we could load before allowing a repeat. The
 * caller can combine quick random samples with a bounded catalog scan.
 */
export function pickPuzzleFromCatalog<T extends PuzzleCandidate>(
	sampledCandidates: readonly T[],
	catalogCandidates: readonly T[],
	seenPuzzleIds: ReadonlySet<string>,
	currentPuzzleId?: string,
	random: () => number = Math.random,
): CatalogSelection<T> {
	const candidates = mergePuzzleCandidates(
		sampledCandidates,
		catalogCandidates,
	);
	const unseen = pickUnseenPuzzle(candidates, seenPuzzleIds, random);
	if (unseen) return { candidate: unseen, reused: false };

	return {
		candidate: pickPuzzleAfterHistoryIsExhausted(
			candidates,
			currentPuzzleId,
			random,
		),
		reused: true,
	};
}
