import { describe, expect, test } from "bun:test";
import type { Board } from "@/types";
import { parsePuzzle } from "./sudoku";
import { findSkyscraper, findTwoStringKite } from "./turbotFish";

type CandidateGrid = Set<number>[][];

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
const REPORTED_CURRENT =
	"000085040208374005050021080070598030583267194629143578940852003002439850835716429";
const REPORTED_SOLUTION =
	"317685942298374615456921387174598236583267194629143578941852763762439851835716429";

function emptyCandidates(): CandidateGrid {
	return Array.from({ length: 9 }, () =>
		Array.from({ length: 9 }, () => new Set<number>()),
	);
}

function candidatesWith(value: number, cells: [number, number][]) {
	const candidates = emptyCandidates();
	for (const [row, col] of cells) candidates[row]?.[col]?.add(value);
	return candidates;
}

function transpose(candidates: CandidateGrid): CandidateGrid {
	return Array.from({ length: 9 }, (_, row) =>
		Array.from(
			{ length: 9 },
			(__, col) => new Set(candidates[col]?.[row] ?? []),
		),
	);
}

function legalCandidates(board: Board): CandidateGrid {
	return DIGITS.map((_, row) =>
		DIGITS.map((__, col) => {
			if (board[row]?.[col] !== null) return new Set<number>();
			const used = new Set<number>();
			for (let index = 0; index < 9; index++) {
				const rowValue = board[row]?.[index];
				const columnValue = board[index]?.[col];
				if (rowValue !== null && rowValue !== undefined) used.add(rowValue);
				if (columnValue !== null && columnValue !== undefined) {
					used.add(columnValue);
				}
			}
			const startRow = Math.floor(row / 3) * 3;
			const startCol = Math.floor(col / 3) * 3;
			for (let rowOffset = 0; rowOffset < 3; rowOffset++) {
				for (let colOffset = 0; colOffset < 3; colOffset++) {
					const value = board[startRow + rowOffset]?.[startCol + colOffset];
					if (value !== null && value !== undefined) used.add(value);
				}
			}
			return new Set(DIGITS.filter((value) => !used.has(value)));
		}),
	);
}

describe("findSkyscraper", () => {
	test("finds row and transposed patterns and removes only common peers", () => {
		const candidates = candidatesWith(4, [
			[1, 1],
			[1, 6],
			[6, 1],
			[6, 8],
			[7, 6],
			[2, 1],
			[3, 6],
		]);

		const rowPattern = findSkyscraper(candidates);
		expect(rowPattern).toMatchObject({
			technique: "Skyscraper",
			value: 4,
			strongLinks: [{ house: { type: "row" } }, { house: { type: "row" } }],
			bridgeHouse: { type: "column", index: 1 },
			eliminations: [{ row: 7, col: 6 }],
		});

		const columnPattern = findSkyscraper(transpose(candidates));
		expect(columnPattern).toMatchObject({
			technique: "Skyscraper",
			value: 4,
			strongLinks: [
				{ house: { type: "column" } },
				{ house: { type: "column" } },
			],
			bridgeHouse: { type: "row", index: 1 },
			eliminations: [{ row: 6, col: 7 }],
		});
	});

	test("rejects X-Wings, unaligned links, and source lines with extras", () => {
		const xWing = candidatesWith(4, [
			[0, 0],
			[0, 4],
			[4, 0],
			[4, 4],
		]);
		const unaligned = candidatesWith(4, [
			[0, 0],
			[0, 4],
			[4, 1],
			[4, 5],
		]);
		const extraSourceCandidates = candidatesWith(4, [
			[0, 0],
			[0, 4],
			[0, 8],
			[4, 2],
			[4, 4],
			[3, 0],
			[8, 0],
			[8, 4],
			[8, 8],
		]);

		expect(findSkyscraper(xWing)).toBeNull();
		expect(findSkyscraper(unaligned)).toBeNull();
		expect(findSkyscraper(extraSourceCandidates)).toBeNull();
	});
});

describe("findTwoStringKite", () => {
	test("finds the canonical pattern in both orientations", () => {
		const candidates = candidatesWith(7, [
			[1, 1],
			[1, 7],
			[0, 8],
			[7, 8],
			[7, 1],
		]);

		expect(findTwoStringKite(candidates)).toMatchObject({
			technique: "2-String Kite",
			value: 7,
			bridgeHouse: { type: "box", index: 2 },
			eliminations: [{ row: 7, col: 1 }],
		});
		expect(findTwoStringKite(transpose(candidates))).toMatchObject({
			technique: "2-String Kite",
			value: 7,
			bridgeHouse: { type: "box", index: 6 },
			eliminations: [{ row: 1, col: 7 }],
		});
	});

	test("rejects shared-cell links and source lines with extra candidates", () => {
		const sharedCell = candidatesWith(7, [
			[1, 1],
			[1, 7],
			[7, 1],
			[7, 7],
		]);
		const extraSourceCandidates = candidatesWith(7, [
			[1, 1],
			[1, 4],
			[1, 7],
			[4, 1],
			[4, 4],
			[4, 8],
			[7, 1],
			[7, 4],
			[7, 8],
		]);

		expect(findTwoStringKite(sharedCell)).toBeNull();
		expect(findTwoStringKite(extraSourceCandidates)).toBeNull();
	});

	test("requires the bridge candidates to share a box", () => {
		const differentBridgeBoxes = candidatesWith(7, [
			[1, 1],
			[1, 7],
			[3, 8],
			[7, 8],
			[7, 1],
		]);

		expect(findTwoStringKite(differentBridgeBoxes)).toBeNull();
	});

	test("allows unrelated extra candidates inside the weak-link box", () => {
		const candidates = candidatesWith(7, [
			[1, 1],
			[1, 7],
			[0, 8],
			[7, 8],
			[7, 1],
			[2, 6],
		]);

		expect(findTwoStringKite(candidates)).toMatchObject({
			technique: "2-String Kite",
			value: 7,
			bridgeHouse: { type: "box", index: 2 },
			eliminations: [{ row: 7, col: 1 }],
		});
	});
});

test("the reported position finds both safe eliminations", () => {
	const current = parsePuzzle(REPORTED_CURRENT);
	const solution = parsePuzzle(REPORTED_SOLUTION);
	const candidates = legalCandidates(current);
	const skyscraper = findSkyscraper(candidates);
	const kite = findTwoStringKite(candidates);

	expect(skyscraper).toMatchObject({
		technique: "Skyscraper",
		value: 1,
		strongLinks: [
			{ house: { type: "row", index: 1 } },
			{ house: { type: "row", index: 6 } },
		],
		bridgeHouse: { type: "column", index: 7 },
		eliminations: [
			{ row: 0, col: 2 },
			{ row: 7, col: 1 },
		],
	});
	expect(kite).toMatchObject({
		technique: "2-String Kite",
		value: 1,
		eliminations: [{ row: 7, col: 1 }],
	});

	for (const pattern of [skyscraper, kite]) {
		if (!pattern) throw new Error("Expected a Turbot Fish pattern");
		for (const elimination of pattern.eliminations) {
			expect(solution[elimination.row]?.[elimination.col]).not.toBe(
				pattern.value,
			);
		}
	}
});
