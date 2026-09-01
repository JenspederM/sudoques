import { expect, test } from "bun:test";
import { classifyDifficulty } from "./difficulty";
import {
	analyzeLogicalTechniques,
	gradePuzzle,
	isCurrentLogicalTechniqueAnalysis,
	SudokuSolver,
} from "./solver";
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

test("the reported Turbot Fish puzzle is solved logically and remains hard", () => {
	const board = parsePuzzle(
		"000000000200374005050000080070090030080207090009040500900852003000030000005010400",
	);
	const graded = gradePuzzle(board);

	expect(graded.isSolvable).toBe(true);
	expect(graded.techniquesUsed.has("Skyscraper")).toBe(true);
	expect(graded.techniquesUsed.has("Backtracking")).toBe(false);
	expect(classifyDifficulty(graded.techniquesUsed)).toBe("hard");
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

test("gradePuzzle records the observed techniques for the reported hard puzzle", () => {
	const board = parsePuzzle(
		"020780000000305002000092000095000068801000907740000130000920000500607000000031070",
	);
	const graded = gradePuzzle(board);

	expect(graded.isSolvable).toBe(true);
	expect([...graded.techniquesUsed]).toEqual([
		"Naked Single",
		"Hidden Single",
		"Pointing Pairs",
		"Naked Pair",
		"Hidden Pair",
		"2-String Kite",
		"X-Wing",
	]);
});

test("bounded analysis finds the lower Turbot Fish route for the reported hard puzzle", () => {
	const board = parsePuzzle(
		"020780000000305002000092000095000068801000907740000130000920000500607000000031070",
	);
	const analysis = analyzeLogicalTechniques(board);

	expect(analysis.status).toBe("solved-logically");
	expect(analysis.minimumCeiling).toBe(30);
	expect(analysis.unavoidableInReruns).toEqual(["2-String Kite"]);
	expect(analysis.routes).toEqual([
		{
			techniques: [
				"Naked Single",
				"Hidden Single",
				"Pointing Pairs",
				"Naked Pair",
				"Hidden Pair",
				"2-String Kite",
			],
			frontier: ["2-String Kite"],
		},
	]);

	// The newly supported kite removes the old need to report either X-Wing +
	// XY-Chain or Simple Colouring as the lowest supported logical route.
	expect(analysis.routes[0]?.techniques).not.toContain("X-Wing");
	expect(analysis.routes[0]?.techniques).not.toContain("XY-Chain");
	expect(analysis.routes[0]?.techniques).not.toContain("Simple Colouring");
});

test("every reported bounded route deterministically reaches the same valid solution without search", () => {
	const puzzle =
		"020780000000305002000092000095000068801000907740000130000920000500607000000031070";
	const board = parsePuzzle(puzzle);
	const expectedSolution = gradePuzzle(board).solution;
	const firstAnalysis = analyzeLogicalTechniques(board, { useCache: false });
	const secondAnalysis = analyzeLogicalTechniques(parsePuzzle(puzzle), {
		useCache: false,
	});

	expect(secondAnalysis).toEqual(firstAnalysis);
	const persistedRoundTrip = JSON.parse(JSON.stringify(firstAnalysis));
	expect(isCurrentLogicalTechniqueAnalysis(persistedRoundTrip)).toBe(true);
	expect(persistedRoundTrip).toEqual(firstAnalysis);
	expect(
		isCurrentLogicalTechniqueAnalysis({
			...persistedRoundTrip,
			version: "bounded-logical-v1",
		}),
	).toBe(false);
	expect(
		isCurrentLogicalTechniqueAnalysis({
			...persistedRoundTrip,
			routes: [{ techniques: ["Not implemented"], frontier: [] }],
		}),
	).toBe(false);
	for (const route of firstAnalysis.routes) {
		const solved = new SudokuSolver(board, {
			allowedTechniques: new Set(route.techniques),
			allowBacktracking: false,
		}).solve();
		expect(solved.isSolvable).toBe(true);
		expect(solved.techniquesUsed.has("Backtracking")).toBe(false);
		expect(solved.solution).toEqual(expectedSolution);
	}
});

test("bounded analysis distinguishes a completed grid from a puzzle that needs search", () => {
	const reportedBoard = parsePuzzle(
		"020780000000305002000092000095000068801000907740000130000920000500607000000031070",
	);
	const completedBoard = gradePuzzle(reportedBoard).solution;
	if (!completedBoard) throw new Error("Expected the reported puzzle to solve");

	expect(
		analyzeLogicalTechniques(completedBoard, { useCache: false }),
	).toMatchObject({
		status: "solved-logically",
		minimumCeiling: 0,
		routes: [{ techniques: [], frontier: [] }],
	});

	const searchPuzzle = parsePuzzle(
		"200050006010000090600801003007090600000703000900080002100000005060902010003060200",
	);
	expect(
		analyzeLogicalTechniques(searchPuzzle, { useCache: false }),
	).toMatchObject({
		status: "search-needed",
		minimumCeiling: null,
		routes: [],
	});
});
