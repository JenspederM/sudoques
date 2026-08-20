import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { getGesturePadLayout } from "@/lib/cellGestureNumpad";
import { CellGestureNumpadSurface } from "./CellGestureNumpad";

const layout = getGesturePadLayout(
	{ left: 100, top: 200, width: 40, height: 40 },
	{ left: 0, top: 0, width: 375, height: 667 },
);

describe("CellGestureNumpadSurface", () => {
	test("renders a familiar 1-9 grid with its active and disabled states", () => {
		const markup = renderToStaticMarkup(
			<CellGestureNumpadSurface
				gesture={{
					row: 1,
					col: 2,
					mode: "value",
					layout,
					activeValue: 5,
					disabledNumbers: [9],
				}}
			/>,
		);

		expect(markup).toContain('data-input-mode="value"');
		for (let value = 1; value <= 9; value += 1) {
			expect(markup).toContain(`data-testid="cell-gesture-key-${value}"`);
		}
		expect(markup).toMatch(
			/data-testid="cell-gesture-key-5"[^>]*data-active="true"/,
		);
		expect(markup).toMatch(
			/data-testid="cell-gesture-key-9"[^>]*data-disabled="true"/,
		);
	});

	test("makes note entry visually distinct without becoming pointer-interactive", () => {
		const markup = renderToStaticMarkup(
			<CellGestureNumpadSurface
				gesture={{
					row: 1,
					col: 2,
					mode: "note",
					layout,
					activeValue: null,
					disabledNumbers: [],
				}}
			/>,
		);

		expect(markup).toContain('data-input-mode="note"');
		expect(markup).toContain("pointer-events-none");
		expect(markup).toContain("ring-primary/80");
	});
});
