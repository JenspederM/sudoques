import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { InitialGameResumeGate } from "./InitialGameResumeGate";

describe("InitialGameResumeGate", () => {
	test.each([
		"wait",
		"resume",
	] as const)("shows a loader and suppresses route content for %s", (decision) => {
		const markup = renderToStaticMarkup(
			<InitialGameResumeGate decision={decision}>
				<div data-testid="route-content">Home</div>
			</InitialGameResumeGate>,
		);

		expect(markup).toContain("animate-spin");
		expect(markup).not.toContain("route-content");
		expect(markup).not.toContain("Home");
	});

	test("renders route content after the boot decision settles", () => {
		const markup = renderToStaticMarkup(
			<InitialGameResumeGate decision="stay">
				<div data-testid="route-content">Home</div>
			</InitialGameResumeGate>,
		);

		expect(markup).toContain('data-testid="route-content"');
		expect(markup).toContain("Home");
		expect(markup).not.toContain("animate-spin");
	});

	test("shows usable Home content for a provisional cache miss", () => {
		const markup = renderToStaticMarkup(
			<InitialGameResumeGate decision="wait" showProvisionalHome>
				<div data-testid="route-content">Home</div>
			</InitialGameResumeGate>,
		);

		expect(markup).toContain('data-testid="route-content"');
		expect(markup).toContain("Home");
		expect(markup).not.toContain("animate-spin");
	});
});
