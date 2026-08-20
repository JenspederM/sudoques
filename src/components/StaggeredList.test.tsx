import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { StaggeredListElement } from "./StaggeredList";

describe("StaggeredListElement SSR", () => {
	test("composes button base, variant, and caller classes", () => {
		const markup = renderToStaticMarkup(
			<StaggeredListElement
				type="button"
				variant="default"
				className="caller-layout"
				aria-label="Choose difficulty"
			>
				Choose
			</StaggeredListElement>,
		);

		expect(markup).toContain("<button");
		expect(markup).toContain('type="button"');
		expect(markup).toContain('aria-label="Choose difficulty"');
		expect(markup).toContain("appearance-none");
		expect(markup).toContain("bg-glass");
		expect(markup).toContain("border-border");
		expect(markup).toContain("caller-layout");
		expect(markup).toContain(">Choose</button>");
	});

	test("composes card base, variant, and caller classes without leaking custom props", () => {
		const markup = renderToStaticMarkup(
			<StaggeredListElement
				type="card"
				variant="brand"
				className="caller-card"
				data-testid="card"
			>
				Card
			</StaggeredListElement>,
		);

		expect(markup).toContain("<div");
		expect(markup).toContain('data-testid="card"');
		expect(markup).toContain("rounded-2xl");
		expect(markup).toContain("bg-primary");
		expect(markup).toContain("border-border");
		expect(markup).toContain("caller-card");
		expect(markup).not.toContain('type="card"');
		expect(markup).not.toContain("variant=");
	});
});
