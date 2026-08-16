import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
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
) =>
	renderToStaticMarkup(
		<SudokuGrid
			initialBoard={initialBoard}
			currentBoard={currentBoard}
			notes={emptyNotes()}
			selectedCell={selectedCell}
			onCellSelect={() => undefined}
			conflicts={[]}
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
});
