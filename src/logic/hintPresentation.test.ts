import { describe, expect, test } from "bun:test";
import type { HintStep, HintTechnique } from "./explainableSolver";
import {
	getInitialHintDisclosureStage,
	getTechniqueExplanation,
	getVisibleHintStep,
	nextHintDisclosureStage,
	previousHintDisclosureStage,
} from "./hintPresentation";

const STEP: HintStep = {
	technique: "Y-Wing",
	kind: "elimination",
	title: "Y-Wing removes 7",
	summary: "The pivot links two pincers.",
	details: ["Follow the candidates.", "Remove 7."],
	pattern: [
		{ row: 1, col: 1, value: 2 },
		{ row: 1, col: 1, value: 7 },
		{ row: 4, col: 1, value: 7 },
	],
	eliminations: [{ row: 4, col: 4, value: 7 }],
	houses: [{ type: "column", index: 1 }],
};

describe("hint disclosure", () => {
	test("shows correction warnings immediately instead of hiding them in stages", () => {
		const correction: HintStep = {
			...STEP,
			technique: "Check for mistakes",
			kind: "correction",
			cells: [{ row: 1, col: 1, role: "warning" }],
		};

		expect(
			getInitialHintDisclosureStage({
				status: "invalid",
				message: "Fix the marked entry before continuing.",
				steps: [correction],
			}),
		).toBe("details");
		expect(
			getInitialHintDisclosureStage({
				status: "hint",
				message: "Correction",
				steps: [correction],
			}),
		).toBe("details");
	});

	test("starts ordinary logical hints with only the technique visible", () => {
		expect(
			getInitialHintDisclosureStage({
				status: "hint",
				message: "Hint",
				steps: [STEP],
			}),
		).toBe("technique");
	});

	test("moves forward and backward without leaving the supported stages", () => {
		expect(nextHintDisclosureStage("technique")).toBe("location");
		expect(nextHintDisclosureStage("location")).toBe("details");
		expect(nextHintDisclosureStage("details")).toBe("details");
		expect(previousHintDisclosureStage("details")).toBe("location");
		expect(previousHintDisclosureStage("location")).toBe("technique");
		expect(previousHintDisclosureStage("technique")).toBe("technique");
	});

	test("reveals no board information at the technique-only stage", () => {
		expect(getVisibleHintStep(STEP, "technique")).toBeNull();
	});

	test("reveals locations but strips candidate values and actions", () => {
		const visible = getVisibleHintStep(STEP, "location");

		expect(visible?.pattern).toEqual([]);
		expect(visible?.eliminations).toEqual([]);
		expect(visible?.placement).toBeUndefined();
		expect(visible?.details).toEqual([]);
		expect(visible?.houses).toEqual(STEP.houses);
		expect(visible?.cells).toEqual([
			{ row: 1, col: 1, role: "focus" },
			{ row: 4, col: 1, role: "focus" },
			{ row: 4, col: 4, role: "focus" },
		]);
	});

	test("reveals the original step only at the full-detail stage", () => {
		expect(getVisibleHintStep(STEP, "details")).toBe(STEP);
	});
});

describe("technique explanations", () => {
	test("defines Y-Wing pincers in plain language", () => {
		const explanation = getTechniqueExplanation("Y-Wing");

		expect(explanation).toContain("called pincers");
		expect(explanation).toContain("cells that see both pincers");
	});

	test("explains the distinguishing Turbot Fish links", () => {
		expect(getTechniqueExplanation("Skyscraper")).toContain(
			"two unaligned ends",
		);
		expect(getTechniqueExplanation("2-String Kite")).toContain("same box");
	});

	test("explains the strong and weak links in an AIC", () => {
		const explanation = getTechniqueExplanation("Alternating Inference Chain");

		expect(explanation).toContain("strong links");
		expect(explanation).toContain("weak links");
		expect(explanation).toContain("both endpoints");
	});

	test("covers every technique the explainable hint solver can display", () => {
		const techniques: HintTechnique[] = [
			"Naked Single",
			"Hidden Single",
			"Pointing Pairs",
			"Line/Box Reduction",
			"Naked Pair",
			"Hidden Pair",
			"Naked Triple",
			"Hidden Triple",
			"Naked Quad",
			"Hidden Quad",
			"X-Wing",
			"Skyscraper",
			"2-String Kite",
			"Swordfish",
			"Jellyfish",
			"Y-Wing",
			"XYZ-Wing",
			"Unique Rectangle Type 1",
			"Simple Colouring",
			"XY-Chain",
			"Alternating Inference Chain",
			"BUG+1",
			"Cell Forcing Chain",
			"Check for mistakes",
		];

		for (const technique of techniques) {
			expect(getTechniqueExplanation(technique).length).toBeGreaterThan(40);
		}
	});
});
