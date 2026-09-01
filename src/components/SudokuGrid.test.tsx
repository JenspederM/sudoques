import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { HintStep } from "@/logic/explainableSolver";
import type { Board } from "@/types";
import { SudokuGrid } from "./SudokuGrid";

const emptyBoard = (): Board =>
	Array.from({ length: 9 }, () => Array<number | null>(9).fill(null));

const emptyNotes = () =>
	Array.from({ length: 9 }, () =>
		Array.from({ length: 9 }, () => new Set<number>()),
	);

const cellTag = (markup: string, row: number, col: number) => {
	const tag = markup.match(
		new RegExp(`<div[^>]*data-testid="cell-${row}-${col}"[^>]*>`),
	)?.[0];
	if (!tag) throw new Error(`Missing cell ${row},${col}`);
	return tag;
};

const renderGrid = (
	initialBoard: Board,
	currentBoard: Board,
	selectedCell: [number, number],
	notes = emptyNotes(),
	hintStep?: HintStep,
) =>
	renderToStaticMarkup(
		<SudokuGrid
			initialBoard={initialBoard}
			currentBoard={currentBoard}
			notes={notes}
			selectedCell={selectedCell}
			onCellSelect={() => undefined}
			conflicts={[]}
			hintStep={hintStep}
		/>,
	);

describe("SudokuGrid visual states", () => {
	test("player-entered digits keep their provenance when selected or matching", () => {
		const initial = emptyBoard();
		const current = emptyBoard();
		if (!current[0]) throw new Error("Board row is missing");
		current[0][0] = 5;
		current[0][4] = 5;

		const markup = renderGrid(initial, current, [0, 0]);
		const selected = cellTag(markup, 0, 0);
		const matching = cellTag(markup, 0, 4);

		for (const cell of [selected, matching]) {
			expect(cell).toContain('data-origin="player"');
			expect(cell).toContain("text-[var(--player-number)]");
			expect(cell).not.toContain("text-foreground");
			expect(cell).not.toContain("font-bold");
		}
	});

	test("given digits stay visually distinct when selected", () => {
		const initial = emptyBoard();
		const current = emptyBoard();
		if (!initial[0] || !current[0]) throw new Error("Board row is missing");
		initial[0][0] = 5;
		current[0][0] = 5;

		const selected = cellTag(renderGrid(initial, current, [0, 0]), 0, 0);

		expect(selected).toContain('data-origin="given"');
		expect(selected).toContain("text-foreground");
		expect(selected).toContain("font-bold");
		expect(selected).not.toContain("text-[var(--player-number)]");
	});

	test("uses separate visual tokens for cell lines and box dividers", () => {
		const markup = renderGrid(emptyBoard(), emptyBoard(), [0, 0]);

		expect(markup).toContain('data-testid="sudoku-grid"');
		expect(markup).toContain("bg-[var(--grid-line)]");
		expect(markup).toContain('data-testid="box-dividers"');
		expect(markup).toContain("bg-[var(--grid-divider)]");
	});

	test("highlights the matching candidate glyph without highlighting its cell as a matching value", () => {
		const initial = emptyBoard();
		const current = emptyBoard();
		const notes = emptyNotes();
		if (!current[0] || !notes[4]?.[4]) throw new Error("Board is missing");
		current[0][0] = 5;
		notes[4][4].add(5);

		const markup = renderGrid(initial, current, [0, 0], notes);
		const noteCell = cellTag(markup, 4, 4);

		expect(noteCell).toContain('data-highlight="none"');
		expect(markup).toContain('data-note-highlight="true"');
		expect(markup).toContain("bg-primary/25");
	});

	test("lets hint candidate styling take precedence over a matching-note highlight", () => {
		const initial = emptyBoard();
		const current = emptyBoard();
		const notes = emptyNotes();
		if (!current[0] || !notes[4]?.[4]) throw new Error("Board is missing");
		current[0][0] = 5;
		notes[4][4].add(5);

		const hintStep: HintStep = {
			technique: "Naked Pair",
			kind: "elimination",
			title: "Remove a candidate",
			summary: "",
			details: [],
			pattern: [],
			eliminations: [{ row: 4, col: 4, value: 5 }],
		};
		const markup = renderGrid(initial, current, [0, 0], notes, hintStep);

		expect(markup).toContain('data-hint-candidate="elimination"');
		expect(markup).not.toContain('data-note-highlight="true"');
		expect(markup).not.toContain("bg-primary/25");
		expect(markup).toContain("text-red-500");
	});
});
