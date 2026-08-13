import { describe, expect, test } from "bun:test";
import { findExplainableHint } from "./explainableSolver";
import { parsePuzzle } from "./sudoku";

const CLASSIC_PUZZLE =
	"530070000600195000098000060800060003400803001700020006060000280000419005000080079";
const CLASSIC_SOLUTION =
	"534678912672195348198342567859761423426853791713924856961537284287419635345286179";

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

	test("reports a completed puzzle", () => {
		const solution = parsePuzzle(CLASSIC_SOLUTION);
		expect(findExplainableHint(solution, solution)).toEqual({
			status: "complete",
			message: "The puzzle is already complete.",
			steps: [],
		});
	});
});
