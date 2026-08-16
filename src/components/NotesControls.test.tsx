import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { GameControls } from "./GameControls";
import { Numpad } from "./Numpad";

const noop = () => undefined;

describe("notes controls", () => {
	test("persistent notes mode is exposed by text, semantics, and numpad state", () => {
		const controls = renderToStaticMarkup(
			<GameControls
				isNoteMode={true}
				onToggleNoteMode={noop}
				onUndo={noop}
				onRedo={noop}
				canUndo={false}
				canRedo={false}
			/>,
		);
		const numpad = renderToStaticMarkup(
			<Numpad onNumberClick={noop} onQuickNote={noop} isNoteMode={true} />,
		);

		expect(controls).toContain('aria-pressed="true"');
		expect(controls).toContain("Notes On");
		expect(controls).toContain("Tap number for note");
		expect(controls).not.toContain("animate-bounce");
		expect(numpad).toContain('aria-label="Number pad, notes mode"');
		expect(numpad.match(/data-note-mode="true"/g)).toHaveLength(9);
	});

	test("value mode exposes the press-and-hold shortcut", () => {
		const controls = renderToStaticMarkup(
			<GameControls
				isNoteMode={false}
				onToggleNoteMode={noop}
				onUndo={noop}
				onRedo={noop}
				canUndo={false}
				canRedo={false}
			/>,
		);
		const numpad = renderToStaticMarkup(
			<Numpad onNumberClick={noop} onQuickNote={noop} isNoteMode={false} />,
		);

		expect(controls).toContain('aria-pressed="false"');
		expect(controls).toContain("Hold number for note");
		expect(numpad).toContain('aria-label="Number pad, value mode"');
		expect(numpad).toContain("Press and hold to toggle note 1");
	});
});
