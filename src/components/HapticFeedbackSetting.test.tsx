import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { HapticFeedbackSetting } from "./HapticFeedbackSetting";

describe("HapticFeedbackSetting", () => {
	test("stays visible when the settings list overflows a short viewport", () => {
		const markup = renderToStaticMarkup(
			<HapticFeedbackSetting enabled={true} onToggle={() => {}} />,
		);

		expect(markup).toContain('data-testid="haptic-feedback-setting"');
		expect(markup).toContain("shrink-0");
		expect(markup).toContain("min-h-20");
		expect(markup).toContain('role="switch"');
		expect(markup).toContain('aria-checked="true"');
		expect(markup).toContain("Haptic feedback");
	});
});
