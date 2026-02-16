import { expect, test } from "bun:test";
import { gradePuzzle } from "./solver";
import { parsePuzzle } from "./sudoku";

test("gradePuzzle - Pointing Pairs", () => {
	const puzzleStr =
		"070010050900300007000080000000000200012004900000100005003900406006001070780530000";
	const board = parsePuzzle(puzzleStr);
	const graded = gradePuzzle(board);

	expect(graded.isSolvable).toBe(true);
	expect(graded.techniquesUsed.has("Pointing Pairs")).toBe(true);
});

test("gradePuzzle - Naked Pair", () => {
	const puzzleStr =
		"000005094000940300020007000400060008301000500008000070052070000007009000800302060";
	const board = parsePuzzle(puzzleStr);
	const graded = gradePuzzle(board);

	expect(graded.isSolvable).toBe(true);
	expect(graded.techniquesUsed.has("Naked Pair")).toBe(true);
});

test("gradePuzzle - Hidden Pair", () => {
	const puzzleStr =
		"300000000040600008100004035800000600000000080500002900604030000005700820073500040";
	const board = parsePuzzle(puzzleStr);
	const graded = gradePuzzle(board);

	expect(graded.isSolvable).toBe(true);
	expect(graded.techniquesUsed.has("Hidden Pair")).toBe(true);
});

test("gradePuzzle - X-Wing", () => {
	const puzzleStr =
		"009020000060000057800030010500009040702600000094003206000060008600000009000004100";
	const board = parsePuzzle(puzzleStr);
	const graded = gradePuzzle(board);

	expect(graded.isSolvable).toBe(true);
	expect(graded.techniquesUsed.has("X-Wing")).toBe(true);
});

test("gradePuzzle - Y-Wing", () => {
	const puzzleStr =
		"050000080000086000000201070009020601280000054703060900090605000000170000030000010";
	const board = parsePuzzle(puzzleStr);
	const graded = gradePuzzle(board);

	expect(graded.isSolvable).toBe(true);
	expect(graded.techniquesUsed.has("Y-Wing")).toBe(true);
});

test("gradePuzzle - XYZ-Wing", () => {
	const puzzleStr =
		"000400600050030000309100200180605004000000000700901053001009408000060010002007000";
	const board = parsePuzzle(puzzleStr);
	const graded = gradePuzzle(board);

	expect(graded.isSolvable).toBe(true);
	expect(graded.techniquesUsed.has("XYZ-Wing")).toBe(true);
});

test("gradePuzzle - Swordfish", () => {
	const puzzleStr =
		"204600005800070900000030020000000096100302007680000000040050000006020008300009602";
	const board = parsePuzzle(puzzleStr);
	const graded = gradePuzzle(board);

	expect(graded.isSolvable).toBe(true);
	expect(graded.techniquesUsed.has("Swordfish")).toBe(true);
});

test("gradePuzzle - Jellyfish", () => {
	const puzzleStr =
		"140000097970000016000000000000453000060170000730020000000000000420060071610000039";
	const board = parsePuzzle(puzzleStr);
	const graded = gradePuzzle(board);

	expect(graded.isSolvable).toBe(true);
	expect(graded.techniquesUsed.has("Jellyfish")).toBe(true);
});

test("gradePuzzle - XY-Chain", () => {
	const puzzleStr =
		"800400057250000640097300800000070406000905000904060000008001720019000085530007004";
	const board = parsePuzzle(puzzleStr);
	const graded = gradePuzzle(board);

	expect(graded.isSolvable).toBe(true);
	expect(graded.techniquesUsed.has("XY-Chain")).toBe(true);
});
