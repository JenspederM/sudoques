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
});
