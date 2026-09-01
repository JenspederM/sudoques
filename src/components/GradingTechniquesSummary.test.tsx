import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { LogicalTechniqueAnalysis } from "@/types";
import { GradingTechniquesSummary } from "./GradingTechniquesSummary";

const reportedPuzzleAnalysis: LogicalTechniqueAnalysis = {
	version: "bounded-logical-v3",
	status: "solved-logically",
	observedTechniques: ["Naked Single", "X-Wing", "XY-Chain"],
	minimumCeiling: 50,
	routes: [
		{
			techniques: ["Naked Single", "X-Wing", "XY-Chain"],
			frontier: ["XY-Chain"],
		},
		{
			techniques: ["Naked Single", "Simple Colouring"],
			frontier: ["Simple Colouring"],
		},
	],
	unavoidableInReruns: [],
};

describe("GradingTechniquesSummary", () => {
	test("shows alternative bounded routes instead of calling path observations required", () => {
		const markup = renderToStaticMarkup(
			<GradingTechniquesSummary
				analysis={reportedPuzzleAnalysis}
				legacyTechniques={["Naked Single", "X-Wing", "XY-Chain"]}
			/>,
		);

		expect(markup).toContain("Bounded logical analysis");
		expect(markup).toContain("Alternative routes found at this level");
		expect(markup).toContain("XY-Chain route");
		expect(markup).toContain("Simple Colouring route");
		expect(markup).toContain("No single technique was unavoidable");
		expect(markup).toContain("does not claim");
		expect(markup).not.toContain("Techniques Required");
	});

	test("separates search from logical techniques", () => {
		const markup = renderToStaticMarkup(
			<GradingTechniquesSummary
				analysis={{
					...reportedPuzzleAnalysis,
					status: "search-needed",
					minimumCeiling: null,
					routes: [],
				}}
			/>,
		);

		expect(markup).toContain('data-testid="grading-search"');
		expect(markup).toContain("Search still needed");
		expect(markup).toContain("backtracking");
	});

	test("labels old arrays as one stored route and explains migration", () => {
		const markup = renderToStaticMarkup(
			<GradingTechniquesSummary
				analysis={null}
				legacyTechniques={["Hidden Single", "Backtracking"]}
			/>,
		);

		expect(markup).toContain("Stored grader route");
		expect(markup).toContain("not a list of techniques every solve requires");
		expect(markup).toContain("regenerate the puzzle data");
		expect(markup).toContain("Guessing/search used");
	});

	test("renders nothing when neither live nor stored analysis exists", () => {
		expect(
			renderToStaticMarkup(
				<GradingTechniquesSummary analysis={null} legacyTechniques={[]} />,
			),
		).toBe("");
	});
});
