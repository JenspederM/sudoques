import type { Difficulty, Technique } from "@/types";

const DIFFICULTIES_BY_RANK = [
	"easy",
	"normal",
	"medium",
	"hard",
	"expert",
	"master",
] as const satisfies readonly Difficulty[];

/**
 * Human-oriented technique tiers. A puzzle belongs to the tier of the most
 * advanced technique needed to solve it, rather than the number of solver
 * operations it happens to take.
 */
const TECHNIQUE_RANK: Record<Technique, number> = {
	"Naked Single": 0,
	"Hidden Single": 1,
	"Naked Pair": 2,
	"Hidden Pair": 2,
	"Pointing Pairs": 2,
	"Line/Box Reduction": 2,
	"Naked Triple": 3,
	"Hidden Triple": 3,
	"Naked Quad": 3,
	"Hidden Quad": 3,
	"BUG+1": 3,
	"X-Wing": 3,
	"Unique Rectangle Type 1": 3,
	"Chute Remote Pair": 4,
	"Simple Colouring": 4,
	"Y-Wing": 4,
	"Rectangle Elimination": 4,
	Swordfish: 4,
	"XYZ-Wing": 4,
	Tridagon: 4,
	"X-Cycle": 4,
	"3D Medusa": 4,
	Jellyfish: 4,
	"Unique Rectangle 2,3,4,5": 4,
	"Avoidable Rectangle": 4,
	"Gurth's Theorem": 5,
	"XY-Chain": 5,
	"Twinned XY-Chain": 5,
	Fireworks: 5,
	"SK Loop": 5,
	"Extended Unique Rectangle": 5,
	"Hidden Unique Rectangle": 5,
	"WXYZ-Wing": 5,
	"Aligned Pair Exclusion": 5,
	Exocet: 5,
	"Grouped X-Cycle": 5,
	"Finned X-Wing": 5,
	"Finned Swordfish": 5,
	"Franken Swordfish": 5,
	"Alternating Inference Chain": 5,
	"Sue-de-Coq": 5,
	"Digit Forcing Chain": 5,
	"Nishio Forcing Chain": 5,
	"Cell Forcing Chain": 5,
	"Unit Forcing Chain": 5,
	"Almost Locked Set": 5,
	"Death Blossom": 5,
	"Pattern Overlay": 5,
	"Quad Forcing Chain": 5,
	"Bowman Bingo": 5,
	Backtracking: 5,
};

export function classifyDifficulty(
	techniques: ReadonlySet<Technique>,
): Difficulty {
	let highestRank = 0;

	for (const technique of techniques) {
		highestRank = Math.max(highestRank, TECHNIQUE_RANK[technique]);
	}

	return DIFFICULTIES_BY_RANK[highestRank] ?? "master";
}
