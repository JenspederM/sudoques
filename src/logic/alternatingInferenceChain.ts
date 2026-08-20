export type AICCandidateGrid = ReadonlyArray<
	ReadonlyArray<ReadonlySet<number>>
>;

export type AICCandidateRef = {
	row: number;
	col: number;
	value: number;
};

export type AICLinkStrength = "strong" | "weak";

export type AICLinkReason =
	| { type: "bivalue-cell" }
	| {
			type: "conjugate-pair";
			house: "row" | "column" | "box";
			index: number;
	  }
	| { type: "same-cell" }
	| {
			type: "same-digit-peer";
			house: "row" | "column" | "box";
			index: number;
	  };

export type AICLink = {
	from: AICCandidateRef;
	to: AICCandidateRef;
	strength: AICLinkStrength;
	reason: AICLinkReason;
};

export type AlternatingInferenceChain = {
	chain: AICCandidateRef[];
	links: AICLink[];
	linkCount: number;
	eliminations: AICCandidateRef[];
};

export const MAX_AIC_LINKS = 23;

type HouseType = "row" | "column" | "box";

type StoredLink = {
	a: string;
	b: string;
	reason: AICLinkReason;
};

type SearchNode = {
	key: string;
	path: string[];
	links: StoredLink[];
};

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

function candidateKey(candidate: AICCandidateRef): string {
	return `${candidate.row},${candidate.col},${candidate.value}`;
}

function parseCandidateKey(key: string): AICCandidateRef {
	const [row, col, value] = key.split(",").map(Number);
	if (row === undefined || col === undefined || value === undefined) {
		throw new Error(`Invalid candidate key: ${key}`);
	}
	return { row, col, value };
}

function compareCandidateKeys(a: string, b: string): number {
	const candidateA = parseCandidateKey(a);
	const candidateB = parseCandidateKey(b);
	return (
		candidateA.row - candidateB.row ||
		candidateA.col - candidateB.col ||
		candidateA.value - candidateB.value
	);
}

function compareKeyPaths(a: readonly string[], b: readonly string[]): number {
	for (let index = 0; index < Math.min(a.length, b.length); index++) {
		const value = compareCandidateKeys(a[index] ?? "", b[index] ?? "");
		if (value !== 0) return value;
	}
	return a.length - b.length;
}

function orderedPair(a: string, b: string): [string, string] {
	return compareCandidateKeys(a, b) <= 0 ? [a, b] : [b, a];
}

function pairKey(a: string, b: string): string {
	const [first, second] = orderedPair(a, b);
	return `${first}|${second}`;
}

function reasonKey(reason: AICLinkReason): string {
	switch (reason.type) {
		case "bivalue-cell":
			return "0";
		case "conjugate-pair":
			return `1:${reason.house}:${reason.index}`;
		case "same-cell":
			return "2";
		case "same-digit-peer":
			return `3:${reason.house}:${reason.index}`;
	}
}

function addLink(
	links: Map<string, StoredLink>,
	a: string,
	b: string,
	reason: AICLinkReason,
) {
	if (a === b) return;
	const [first, second] = orderedPair(a, b);
	const key = pairKey(first, second);
	const existing = links.get(key);
	if (existing && reasonKey(existing.reason) <= reasonKey(reason)) return;
	links.set(key, { a: first, b: second, reason });
}

function cellsInHouse(type: HouseType, index: number) {
	if (type === "row") {
		return DIGITS.map((_, col) => ({ row: index, col }));
	}
	if (type === "column") {
		return DIGITS.map((_, row) => ({ row, col: index }));
	}
	const startRow = Math.floor(index / 3) * 3;
	const startCol = (index % 3) * 3;
	return DIGITS.map((_, offset) => ({
		row: startRow + Math.floor(offset / 3),
		col: startCol + (offset % 3),
	}));
}

function buildGraph(candidates: AICCandidateGrid) {
	const refs = new Map<string, AICCandidateRef>();
	for (let row = 0; row < 9; row++) {
		for (let col = 0; col < 9; col++) {
			const values = [...(candidates[row]?.[col] ?? [])]
				.filter((value) => Number.isInteger(value) && value >= 1 && value <= 9)
				.sort((a, b) => a - b);
			for (const value of values) {
				const candidate = { row, col, value };
				refs.set(candidateKey(candidate), candidate);
			}
		}
	}

	const strongLinks = new Map<string, StoredLink>();
	const weakLinks = new Map<string, StoredLink>();

	for (let row = 0; row < 9; row++) {
		for (let col = 0; col < 9; col++) {
			const cellKeys = [...refs.keys()].filter((key) => {
				const ref = refs.get(key);
				return ref?.row === row && ref.col === col;
			});
			for (let first = 0; first < cellKeys.length; first++) {
				for (let second = first + 1; second < cellKeys.length; second++) {
					const a = cellKeys[first];
					const b = cellKeys[second];
					if (a && b) addLink(weakLinks, a, b, { type: "same-cell" });
				}
			}
			if (cellKeys.length === 2) {
				const [a, b] = cellKeys;
				if (a && b) addLink(strongLinks, a, b, { type: "bivalue-cell" });
			}
		}
	}

	for (const house of ["row", "column", "box"] as const) {
		for (let index = 0; index < 9; index++) {
			const cells = cellsInHouse(house, index);
			for (const value of DIGITS) {
				const keys = cells
					.map(({ row, col }) => candidateKey({ row, col, value }))
					.filter((key) => refs.has(key));
				for (let first = 0; first < keys.length; first++) {
					for (let second = first + 1; second < keys.length; second++) {
						const a = keys[first];
						const b = keys[second];
						if (a && b) {
							addLink(weakLinks, a, b, {
								type: "same-digit-peer",
								house,
								index,
							});
						}
					}
				}
				if (keys.length === 2) {
					const [a, b] = keys;
					if (a && b) {
						addLink(strongLinks, a, b, {
							type: "conjugate-pair",
							house,
							index,
						});
					}
				}
			}
		}
	}

	const makeAdjacency = (links: Map<string, StoredLink>) => {
		const adjacency = new Map<string, StoredLink[]>();
		for (const link of links.values()) {
			adjacency.set(link.a, [...(adjacency.get(link.a) ?? []), link]);
			adjacency.set(link.b, [...(adjacency.get(link.b) ?? []), link]);
		}
		for (const [key, adjacent] of adjacency) {
			adjacent.sort((a, b) => {
				const otherA = a.a === key ? a.b : a.a;
				const otherB = b.a === key ? b.b : b.a;
				return (
					compareCandidateKeys(otherA, otherB) ||
					reasonKey(a.reason).localeCompare(reasonKey(b.reason))
				);
			});
		}
		return adjacency;
	};

	return {
		refs,
		strongAdjacency: makeAdjacency(strongLinks),
		weakAdjacency: makeAdjacency(weakLinks),
	};
}

function otherEnd(link: StoredLink, key: string) {
	return link.a === key ? link.b : link.a;
}

function comparePatterns(
	a: AlternatingInferenceChain,
	b: AlternatingInferenceChain,
) {
	return (
		a.linkCount - b.linkCount ||
		compareKeyPaths(a.chain.map(candidateKey), b.chain.map(candidateKey)) ||
		compareKeyPaths(
			a.eliminations.map(candidateKey),
			b.eliminations.map(candidateKey),
		)
	);
}

/**
 * Finds a bounded, ungrouped endpoint-discontinuity AIC whose strong-linked
 * endpoints jointly exclude one or more candidates. It intentionally does not
 * apply continuous-loop effects or discontinuous-strong placements. The search
 * follows the implication form
 * `A=false -> B=true -> C=false ... -> Z=true`, so links start and end strong.
 * Candidate/parity states are visited once to keep runtime predictable; this is
 * a practical finder rather than an enumeration of every equivalent AIC path.
 */
export function findAlternatingInferenceChain(
	candidates: AICCandidateGrid,
	maxLinks = MAX_AIC_LINKS,
): AlternatingInferenceChain | null {
	if (maxLinks < 1) return null;
	const { refs, strongAdjacency, weakAdjacency } = buildGraph(candidates);
	if (strongAdjacency.size === 0) return null;

	const starts = [...refs.keys()].sort(compareCandidateKeys);
	let best: AlternatingInferenceChain | null = null;

	for (const start of starts) {
		const queue: SearchNode[] = [{ key: start, path: [start], links: [] }];
		const visited = new Set([`${start}:0`]);

		for (let cursor = 0; cursor < queue.length; cursor++) {
			const node = queue[cursor];
			if (!node) continue;
			const depth = node.links.length;
			if (best && depth >= best.linkCount) continue;
			if (depth >= maxLinks) continue;

			const strength: AICLinkStrength = depth % 2 === 0 ? "strong" : "weak";
			const adjacency = strength === "strong" ? strongAdjacency : weakAdjacency;
			for (const link of adjacency.get(node.key) ?? []) {
				const next = otherEnd(link, node.key);
				if (node.path.includes(next)) continue;
				const nextDepth = depth + 1;
				const nextPath = [...node.path, next];
				const nextLinks = [...node.links, link];

				if (nextDepth % 2 === 1) {
					const endpointWeakNeighbors = new Set(
						(weakAdjacency.get(start) ?? []).map((edge) =>
							otherEnd(edge, start),
						),
					);
					const eliminations = (weakAdjacency.get(next) ?? [])
						.map((edge) => otherEnd(edge, next))
						.filter(
							(key) =>
								key !== start && key !== next && endpointWeakNeighbors.has(key),
						)
						.filter((key, index, all) => all.indexOf(key) === index)
						.sort(compareCandidateKeys);

					if (eliminations.length > 0) {
						const reversedPath = [...nextPath].reverse();
						const pathWasReversed = compareKeyPaths(nextPath, reversedPath) > 0;
						const path = pathWasReversed ? reversedPath : nextPath;
						const orderedLinks = pathWasReversed
							? [...nextLinks].reverse()
							: nextLinks;
						const pattern: AlternatingInferenceChain = {
							chain: path.map((key) => ({
								...(refs.get(key) as AICCandidateRef),
							})),
							links: orderedLinks.map((edge, index) => ({
								from: {
									...(refs.get(path[index] ?? "") as AICCandidateRef),
								},
								to: {
									...(refs.get(path[index + 1] ?? "") as AICCandidateRef),
								},
								strength: index % 2 === 0 ? "strong" : "weak",
								reason: edge.reason,
							})),
							linkCount: nextDepth,
							eliminations: eliminations.map((key) => ({
								...(refs.get(key) as AICCandidateRef),
							})),
						};
						if (!best || comparePatterns(pattern, best) < 0) best = pattern;
					}
				}

				const stateKey = `${next}:${nextDepth % 2}`;
				if (visited.has(stateKey)) continue;
				visited.add(stateKey);
				queue.push({ key: next, path: nextPath, links: nextLinks });
			}
		}
	}

	return best;
}
