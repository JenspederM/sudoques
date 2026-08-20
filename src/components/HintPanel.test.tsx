import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { ExplainableHint } from "@/logic/explainableSolver";
import { HintPanel } from "./HintPanel";

const noop = () => undefined;

const CORRECTION_HINT: ExplainableHint = {
	status: "invalid",
	message: "Fix the marked entry before continuing.",
	steps: [
		{
			technique: "Check for mistakes",
			kind: "correction",
			title: "Recheck R1C3",
			summary: "4 conflicts with the puzzle's valid solution path.",
			details: [
				"Remove 4 from R1C3 before requesting a logical hint.",
				"The correct value is deliberately not revealed.",
			],
			pattern: [],
			eliminations: [],
			cells: [{ row: 0, col: 2, role: "warning" }],
		},
	],
};

const AIC_HINT: ExplainableHint = {
	status: "hint",
	message: "A logical chain advances the puzzle.",
	steps: [
		{
			technique: "Alternating Inference Chain",
			kind: "elimination",
			title: "Remove 1 from R4C1",
			summary: "At least one endpoint must be true.",
			details: ["R4C1(4) = R5C1(4) – R4C2(1)."],
			pattern: [
				{ row: 3, col: 0, value: 4, group: "a" },
				{ row: 4, col: 0, value: 4, group: "b" },
			],
			eliminations: [{ row: 3, col: 0, value: 1 }],
		},
	],
};

describe("HintPanel", () => {
	test("renders correction details immediately even if passed the technique stage", () => {
		const markup = renderToStaticMarkup(
			<HintPanel
				hint={CORRECTION_HINT}
				stepIndex={0}
				disclosureStage="technique"
				onDisclosureStageChange={noop}
				onStepChange={noop}
				onClose={noop}
			/>,
		);

		expect(markup).toContain('data-disclosure-stage="details"');
		expect(markup).toContain("Recheck R1C3");
		expect(markup).toContain("The correct value is deliberately not revealed.");
		expect(markup).not.toContain('data-testid="less-hint-detail"');
		expect(markup).not.toContain('data-testid="show-hint-location"');
		expect(markup).not.toContain('data-testid="show-full-hint"');
	});

	test("shows both visual groups in the AIC pattern legend", () => {
		const markup = renderToStaticMarkup(
			<HintPanel
				hint={AIC_HINT}
				stepIndex={0}
				disclosureStage="details"
				onDisclosureStageChange={noop}
				onStepChange={noop}
				onClose={noop}
			/>,
		);

		expect(markup).toContain('data-testid="hint-pattern-legend"');
		expect(markup).toContain("Pattern groups");
		expect(markup).toContain("bg-sky-500");
		expect(markup).toContain("bg-violet-500");
		expect(markup).toContain("R4C1(4) = R5C1(4) – R4C2(1)");
	});
});
