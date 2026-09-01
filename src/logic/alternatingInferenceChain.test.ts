import { describe, expect, test } from "bun:test";
import {
	type AICCandidateGrid,
	type AICCandidateRef,
	type AICLink,
	findAlternatingInferenceChain,
} from "./alternatingInferenceChain";

const STALLED_1809 = `
36 - - - 16 13 - 25 25
36 29 - 269 - 239 - - -
- - 29 2479 24 279 - - -
124 12 - - - - - 124 -
124 - 38 24 - 28 345 - 125
- - 38 - 248 - 34 247 27
- - 29 259 128 1289 45 145 -
- - - 579 - 179 - 157 1579
12 129 - 2679 26 - - - 79
`.trim();

const SOLUTION_1809 =
	"674813925391652784582947163427395618163478592958126347739281456846539271215764839";

function emptyGrid(): Set<number>[][] {
	return Array.from({ length: 9 }, () =>
		Array.from({ length: 9 }, () => new Set<number>()),
	);
}

function setCell(
	candidates: Set<number>[][],
	row: number,
	col: number,
	values: number[],
) {
	const candidateRow = candidates[row];
	if (!candidateRow) throw new Error(`Missing candidate row ${row}`);
	candidateRow[col] = new Set(values);
}

function parseCandidateGrid(source: string): Set<number>[][] {
	return source
		.split("\n")
		.map((row) =>
			row
				.split(/\s+/)
				.map(
					(cell) =>
						new Set(
							cell === "-"
								? []
								: [...cell].map((value) => Number.parseInt(value, 10)),
						),
				),
		);
}

function gridSnapshot(candidates: AICCandidateGrid) {
	return candidates.map((row) =>
		row.map((cell) => [...cell].sort((a, b) => a - b)),
	);
}

function boxIndex({ row, col }: AICCandidateRef) {
	return Math.floor(row / 3) * 3 + Math.floor(col / 3);
}

function areWeaklyLinked(a: AICCandidateRef, b: AICCandidateRef) {
	if (a.row === b.row && a.col === b.col) return a.value !== b.value;
	return (
		a.value === b.value &&
		(a.row === b.row || a.col === b.col || boxIndex(a) === boxIndex(b))
	);
}

function candidatesInHouse(
	candidates: AICCandidateGrid,
	link: AICLink,
): AICCandidateRef[] {
	const reason = link.reason;
	if (reason.type !== "conjugate-pair" && reason.type !== "same-digit-peer") {
		return [];
	}
	const cells: { row: number; col: number }[] = [];
	for (let offset = 0; offset < 9; offset++) {
		if (reason.house === "row") {
			cells.push({ row: reason.index, col: offset });
		} else if (reason.house === "column") {
			cells.push({ row: offset, col: reason.index });
		} else {
			cells.push({
				row: Math.floor(reason.index / 3) * 3 + Math.floor(offset / 3),
				col: (reason.index % 3) * 3 + (offset % 3),
			});
		}
	}
	return cells
		.filter(({ row, col }) => candidates[row]?.[col]?.has(link.from.value))
		.map(({ row, col }) => ({ row, col, value: link.from.value }));
}

function expectValidLink(link: AICLink, candidates: AICCandidateGrid) {
	if (link.strength === "weak") {
		expect(areWeaklyLinked(link.from, link.to)).toBe(true);
		if (link.reason.type === "same-cell") {
			expect(link.from.row).toBe(link.to.row);
			expect(link.from.col).toBe(link.to.col);
		} else {
			expect(link.reason.type).toBe("same-digit-peer");
			expect(candidatesInHouse(candidates, link)).toContainEqual(link.from);
			expect(candidatesInHouse(candidates, link)).toContainEqual(link.to);
		}
		return;
	}

	if (link.reason.type === "bivalue-cell") {
		expect(link.from.row).toBe(link.to.row);
		expect(link.from.col).toBe(link.to.col);
		expect(candidates[link.from.row]?.[link.from.col]?.size).toBe(2);
		return;
	}
	expect(link.reason.type).toBe("conjugate-pair");
	expect(candidatesInHouse(candidates, link)).toEqual(
		expect.arrayContaining([link.from, link.to]),
	);
	expect(candidatesInHouse(candidates, link)).toHaveLength(2);
}

describe("findAlternatingInferenceChain", () => {
	test("finds a one-link conjugate-pair elimination", () => {
		const candidates = emptyGrid();
		setCell(candidates, 0, 0, [1, 2, 3]);
		setCell(candidates, 0, 1, [1, 4, 5]);
		setCell(candidates, 1, 2, [1, 6, 7]);

		expect(findAlternatingInferenceChain(candidates)).toEqual({
			chain: [
				{ row: 0, col: 0, value: 1 },
				{ row: 0, col: 1, value: 1 },
			],
			links: [
				{
					from: { row: 0, col: 0, value: 1 },
					to: { row: 0, col: 1, value: 1 },
					strength: "strong",
					reason: { type: "conjugate-pair", house: "row", index: 0 },
				},
			],
			linkCount: 1,
			eliminations: [{ row: 1, col: 2, value: 1 }],
		});
	});

	test("returns a sound deterministic simple chain for the frozen 18:09 state", () => {
		const candidates = parseCandidateGrid(STALLED_1809);
		const before = gridSnapshot(candidates);
		const result = findAlternatingInferenceChain(candidates);

		expect(result).not.toBeNull();
		if (!result) throw new Error("Expected the 18:09 AIC");
		expect(result.linkCount).toBe(9);
		expect(result.links).toHaveLength(result.linkCount);
		expect(result.chain).toHaveLength(result.linkCount + 1);
		expect(result.eliminations).toEqual([{ row: 3, col: 0, value: 1 }]);
		expect(result.chain[0]?.value).not.toBe(result.chain.at(-1)?.value);

		const uniqueNodes = new Set(
			result.chain.map(({ row, col, value }) => `${row},${col},${value}`),
		);
		expect(uniqueNodes.size).toBe(result.chain.length);

		for (const [index, link] of result.links.entries()) {
			expect(link.from).toEqual(result.chain[index]);
			expect(link.to).toEqual(result.chain[index + 1]);
			expect(link.strength).toBe(index % 2 === 0 ? "strong" : "weak");
			expectValidLink(link, candidates);
		}

		const first = result.chain[0];
		const last = result.chain.at(-1);
		if (!first || !last) throw new Error("Expected endpoints");
		for (const elimination of result.eliminations) {
			expect(areWeaklyLinked(elimination, first)).toBe(true);
			expect(areWeaklyLinked(elimination, last)).toBe(true);
			expect(SOLUTION_1809[elimination.row * 9 + elimination.col]).not.toBe(
				String(elimination.value),
			);
		}

		expect(findAlternatingInferenceChain(candidates)).toEqual(result);
		expect(gridSnapshot(candidates)).toEqual(before);
		expect(findAlternatingInferenceChain(candidates, 8)).toBeNull();
	});

	test("does not invent a strong link from three candidates", () => {
		const candidates = emptyGrid();
		setCell(candidates, 0, 0, [1, 2, 3]);
		setCell(candidates, 0, 1, [1, 4, 5]);
		setCell(candidates, 0, 2, [1, 6, 7]);

		expect(findAlternatingInferenceChain(candidates)).toBeNull();
	});

	test("does not bridge non-peers or eliminate a candidate seeing one endpoint", () => {
		const candidates = emptyGrid();
		setCell(candidates, 0, 0, [1]);
		setCell(candidates, 0, 4, [1]);
		setCell(candidates, 4, 0, [1, 2]);
		setCell(candidates, 8, 0, [1]);

		expect(findAlternatingInferenceChain(candidates)).toBeNull();
	});
});
