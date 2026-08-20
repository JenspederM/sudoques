import { describe, expect, test } from "bun:test";
import { findExplainableHint } from "./explainableSolver";
import { createEmptyNotes, parsePuzzle } from "./sudoku";

const CLASSIC_PUZZLE =
	"530070000600195000098000060800060003400803001700020006060000280000419005000080079";
const CLASSIC_SOLUTION =
	"534678912672195348198342567859761423426853791713924856961537284287419635345286179";
const REPORTED_INITIAL =
	"020780000000305002000092000095000068801000907740000130000920000500607000000031070";
const REPORTED_CURRENT =
	"020786000070315002050492700395174268861253947742869135007928000509647820280531079";
const REPORTED_PROFILE = {
	difficulty: "hard" as const,
	techniques: [
		"Naked Single",
		"Hidden Single",
		"Pointing Pairs",
		"Naked Pair",
		"Hidden Pair",
		"XY-Chain",
		"X-Wing",
	],
};
const REPORTED_PAIR_ONLY_PROFILE = {
	difficulty: "hard" as const,
	techniques: [
		"Naked Single",
		"Hidden Single",
		"Pointing Pairs",
		"Naked Pair",
		"Hidden Pair",
	],
};
const TURBOT_REPORTED_INITIAL =
	"000000000200374005050000080070090030080207090009040500900852003000030000005010400";
const TURBOT_REPORTED_CURRENT =
	"000085040208374005050021080070598030583267194629143578940852003002439850835716429";
const TURBOT_REPORTED_SOLUTION =
	"317685942298374615456921387174598236583267194629143578941852763762439851835716429";
const TURBOT_REPORTED_LEGACY_PROFILE = {
	difficulty: "hard" as const,
	techniques: [
		"Naked Single",
		"Hidden Single",
		"Pointing Pairs",
		"Unique Rectangle Type 1",
		"Line/Box Reduction",
	],
};

function notesWith(entries: [number, number, number[]][]) {
	const notes = createEmptyNotes();
	for (const [row, col, values] of entries) {
		const noteRow = notes[row];
		if (!noteRow) throw new Error("Missing notes row");
		noteRow[col] = new Set(values);
	}
	return notes;
}

describe("findExplainableHint", () => {
	test("explains a naked single without changing the board", () => {
		const initial = parsePuzzle(CLASSIC_PUZZLE);
		const current = initial.map((row) => [...row]);
		const before = JSON.stringify(current);

		const hint = findExplainableHint(
			current,
			initial,
			parsePuzzle(CLASSIC_SOLUTION),
		);

		expect(hint.status).toBe("hint");
		expect(hint.steps).toHaveLength(1);
		expect(hint.steps[0]?.technique).toBe("Naked Single");
		expect(hint.steps[0]?.placement).toEqual({ row: 4, col: 4, value: 5 });
		expect(JSON.stringify(current)).toBe(before);
	});

	test("prefers a concise X-Wing path over a longer greedy sequence", () => {
		const puzzle =
			"030000040071000230080903060004207300007106800100000005040000080006302900000000000";
		const board = parsePuzzle(puzzle);

		const hint = findExplainableHint(board, board);
		const techniques = hint.steps.map((step) => step.technique);
		const xWing = hint.steps.find((step) => step.technique === "X-Wing");

		expect(hint.status).toBe("hint");
		expect(techniques).toEqual(["X-Wing", "Hidden Single"]);
		expect(xWing?.eliminations.length).toBeGreaterThan(0);
		expect(xWing?.pattern.length).toBeGreaterThanOrEqual(4);
		expect(hint.steps.at(-1)?.technique).toBe("Hidden Single");
		expect(hint.steps.at(-1)?.placement).toEqual({ row: 2, col: 0, value: 4 });
		expect(findExplainableHint(board, board)).toEqual(hint);
	});

	test("explains the reported hard position with a Skyscraper before placing R8C2", () => {
		const initial = parsePuzzle(TURBOT_REPORTED_INITIAL);
		const current = parsePuzzle(TURBOT_REPORTED_CURRENT);
		const solution = parsePuzzle(TURBOT_REPORTED_SOLUTION);
		const before = JSON.stringify(current);

		const hint = findExplainableHint(current, initial, solution, {
			...TURBOT_REPORTED_LEGACY_PROFILE,
		});

		expect(hint.status).toBe("hint");
		expect(hint.steps.map((step) => step.technique)).toEqual([
			"Skyscraper",
			"Naked Single",
		]);
		expect(hint.steps[0]?.eliminations).toContainEqual({
			row: 7,
			col: 1,
			value: 1,
		});
		expect(hint.steps.at(-1)?.placement).toEqual({
			row: 7,
			col: 1,
			value: 6,
		});
		for (const step of hint.steps) {
			for (const elimination of step.eliminations) {
				expect(solution[elimination.row]?.[elimination.col]).not.toBe(
					elimination.value,
				);
			}
		}
		expect(JSON.stringify(current)).toBe(before);
	});

	test("never crosses the puzzle's advertised technique ceiling", () => {
		const puzzle =
			"030000040071000230080903060004207300007106800100000005040000080006302900000000000";
		const board = parsePuzzle(puzzle);

		const easyHint = findExplainableHint(board, board, undefined, {
			difficulty: "easy",
			techniques: ["Naked Single", "Hidden Single"],
		});
		const xWingHint = findExplainableHint(board, board, undefined, {
			difficulty: "master",
			techniques: ["Naked Single", "Hidden Single", "X-Wing"],
		});

		expect(easyHint.status).toBe("stuck");
		expect(easyHint.steps).toEqual([]);
		expect(xWingHint.steps.map((step) => step.technique)).toEqual([
			"X-Wing",
			"Hidden Single",
		]);
	});

	test("can explain wings, chains, and a forcing-chain conclusion", () => {
		const puzzle =
			"900600007060070030007000200600508002004000800200301009001000500040050010800009004";
		const board = parsePuzzle(puzzle);

		const hint = findExplainableHint(board, board);
		const techniques = hint.steps.map((step) => step.technique);

		expect(techniques).toContain("XYZ-Wing");
		expect(techniques).toContain("XY-Chain");
		expect(techniques).toContain("Cell Forcing Chain");
		expect(hint.steps.at(-1)?.placement).toEqual({ row: 0, col: 6, value: 4 });
	});

	test("keeps fish coordinates aligned with their actual rows and columns", () => {
		const puzzle =
			"900000005004129600000605000040060020000708000780000063007000300020304080008050100";
		const solution = parsePuzzle(
			"976483215354129678812675439543961827269738541781542963497816352125394786638257194",
		);
		const board = parsePuzzle(puzzle);

		const hint = findExplainableHint(board, board);

		for (const step of hint.steps) {
			for (const elimination of step.eliminations) {
				expect(solution[elimination.row]?.[elimination.col]).not.toBe(
					elimination.value,
				);
			}
			if (step.placement) {
				expect(solution[step.placement.row]?.[step.placement.col]).toBe(
					step.placement.value,
				);
			}
		}
	});

	test("can surface a Jellyfish while solving an advanced puzzle", () => {
		const puzzle =
			"140000097970000016000000000000453000060170000730020000000000000420060071610000039";
		const initial = parsePuzzle(puzzle);
		const current = initial.map((row) => [...row]);
		const techniques = new Set<string>();

		for (let placementCount = 0; placementCount < 81; placementCount++) {
			const hint = findExplainableHint(current, initial);
			for (const step of hint.steps) techniques.add(step.technique);
			const placement = hint.steps.at(-1)?.placement;
			if (!placement) break;
			const row = current[placement.row];
			if (!row) throw new Error("Missing row");
			row[placement.col] = placement.value;
			if (current.every((currentRow) => currentRow.every(Boolean))) break;
		}

		expect(techniques).toContain("Jellyfish");
		expect(current.every((row) => row.every(Boolean))).toBe(true);
		expect(current.flat().join("")).toBe(
			"148536297973842516256791384891453762562178943734629158387914625429365871615287439",
		);
	});

	test("marks an incorrect player entry without revealing its replacement", () => {
		const initial = parsePuzzle(CLASSIC_PUZZLE);
		const current = initial.map((row) => [...row]);
		const row = current[0];
		if (!row) throw new Error("Missing row");
		row[2] = 1;

		const hint = findExplainableHint(
			current,
			initial,
			parsePuzzle(CLASSIC_SOLUTION),
		);

		expect(hint.status).toBe("invalid");
		expect(hint.steps[0]?.technique).toBe("Check for mistakes");
		expect(hint.steps[0]?.cells).toEqual([{ row: 0, col: 2, role: "warning" }]);
		expect(hint.steps[0]?.placement).toBeUndefined();
	});

	test("keeps the advertised ceiling by default when notes cover its deductions", () => {
		const initial = parsePuzzle(REPORTED_INITIAL);
		const current = parsePuzzle(REPORTED_CURRENT);
		const notes = notesWith([
			[0, 6, [3, 5]],
			[1, 6, [4, 6]],
			[6, 0, [4, 6]],
			[6, 1, [1, 3]],
			[6, 6, [3, 5]],
			[6, 7, [1, 5]],
			[6, 8, [4, 6]],
			[7, 1, [1, 3]],
			[7, 8, [1, 3]],
			[8, 2, [4, 6]],
			[8, 6, [4, 6]],
		]);

		const hint = findExplainableHint(current, initial, undefined, {
			...REPORTED_PAIR_ONLY_PROFILE,
			notes,
		});

		expect(hint.status).toBe("stuck");
		expect(hint.steps).toEqual([]);
	});

	test("can opt into continuing past recorded notes in the reported stuck puzzle", () => {
		const initial = parsePuzzle(REPORTED_INITIAL);
		const current = parsePuzzle(REPORTED_CURRENT);
		const notes = createEmptyNotes();
		const setNotes = (row: number, col: number, values: number[]) => {
			const noteRow = notes[row];
			if (!noteRow) throw new Error("Missing notes row");
			noteRow[col] = new Set(values);
		};

		setNotes(0, 6, [3, 5]);
		setNotes(1, 6, [4, 6]);
		setNotes(6, 0, [4, 6]);
		setNotes(6, 1, [1, 3]);
		setNotes(6, 6, [3, 5]);
		setNotes(6, 7, [1, 5]);
		setNotes(6, 8, [4, 6]);
		setNotes(7, 1, [1, 3]);
		setNotes(7, 8, [1, 3]);
		setNotes(8, 2, [4, 6]);
		setNotes(8, 6, [4, 6]);

		const before = notes.map((row) => row.map((cell) => [...cell]));
		const hint = findExplainableHint(current, initial, undefined, {
			...REPORTED_PAIR_ONLY_PROFILE,
			notes,
			allowBeyondProfileAfterRecordedNotes: true,
		});

		expect(hint.status).toBe("hint");
		expect(hint.message).toContain("notes already cover");
		expect(hint.steps.map((step) => step.technique)).toEqual([
			"2-String Kite",
			"Naked Single",
		]);
		expect(hint.steps.at(-1)?.placement).toEqual({
			row: 0,
			col: 2,
			value: 3,
		});
		expect(notes.map((row) => row.map((cell) => [...cell]))).toEqual(before);
	});

	test("skips a naked pair already recorded in both pattern cells", () => {
		const initial = parsePuzzle(REPORTED_INITIAL);
		const current = parsePuzzle(REPORTED_CURRENT);
		const notes = notesWith([
			[1, 6, [4, 6]],
			[8, 6, [4, 6]],
		]);

		const hint = findExplainableHint(current, initial, undefined, {
			...REPORTED_PAIR_ONLY_PROFILE,
			notes,
		});

		expect(hint.steps.map((step) => step.technique)).toEqual(["Hidden Pair"]);
	});

	test("skips a hidden pair already recorded in both pattern cells", () => {
		const initial = parsePuzzle(REPORTED_INITIAL);
		const current = parsePuzzle(REPORTED_CURRENT);
		const notes = notesWith([
			[6, 0, [4, 6]],
			[6, 8, [4, 6]],
		]);

		const hint = findExplainableHint(current, initial, undefined, {
			...REPORTED_PAIR_ONLY_PROFILE,
			notes,
		});

		expect(hint.steps.map((step) => step.technique)).toEqual(["Naked Pair"]);
	});

	test("does not treat sparse pair notes as a recorded deduction", () => {
		const initial = parsePuzzle(REPORTED_INITIAL);
		const current = parsePuzzle(REPORTED_CURRENT);
		const baseline = findExplainableHint(current, initial, undefined, {
			...REPORTED_PROFILE,
		});
		const notes = notesWith([[1, 6, [4, 6]]]);

		const hint = findExplainableHint(current, initial, undefined, {
			...REPORTED_PROFILE,
			notes,
		});

		expect(hint).toEqual(baseline);
	});

	test("does not trust extra or different pair notes as proof", () => {
		const initial = parsePuzzle(REPORTED_INITIAL);
		const current = parsePuzzle(REPORTED_CURRENT);
		const baseline = findExplainableHint(current, initial, undefined, {
			...REPORTED_PROFILE,
		});
		const notes = notesWith([
			[1, 6, [4, 6]],
			[8, 6, [4, 6, 9]],
			[6, 0, [4]],
			[6, 8, [4, 6]],
		]);

		const hint = findExplainableHint(current, initial, undefined, {
			...REPORTED_PROFILE,
			notes,
		});

		expect(hint).toEqual(baseline);
	});

	test("does not turn a single correct note into a fake naked single", () => {
		const initial = parsePuzzle(CLASSIC_PUZZLE);
		const notes = createEmptyNotes();
		const firstRow = notes[0];
		if (!firstRow) throw new Error("Missing notes row");
		firstRow[2] = new Set([4]);
		const withoutNotes = findExplainableHint(
			initial,
			initial,
			parsePuzzle(CLASSIC_SOLUTION),
		);

		const hint = findExplainableHint(
			initial,
			initial,
			parsePuzzle(CLASSIC_SOLUTION),
			{ notes },
		);

		expect(hint).toEqual(withoutNotes);
	});

	test("does not use a wrong or partial note as candidate proof", () => {
		const initial = parsePuzzle(CLASSIC_PUZZLE);
		const notes = createEmptyNotes();
		const firstRow = notes[0];
		if (!firstRow) throw new Error("Missing notes row");
		firstRow[2] = new Set([1]);
		const withoutNotes = findExplainableHint(initial, initial);

		const hint = findExplainableHint(initial, initial, undefined, { notes });

		expect(hint).toEqual(withoutNotes);
	});

	test("reports a completed puzzle", () => {
		const solution = parsePuzzle(CLASSIC_SOLUTION);
		expect(findExplainableHint(solution, solution)).toEqual({
			status: "complete",
			message: "The puzzle is already complete.",
			steps: [],
		});
	});
});
