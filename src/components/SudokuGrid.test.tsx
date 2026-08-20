import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { PendingNoteToggle } from "@/lib/doubleTapInput";
import type { HintStep } from "@/logic/explainableSolver";
import type { Board, CellNotes } from "@/types";
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
	options: {
		conflicts?: { row: number; col: number }[];
		pendingValue?: { row: number; col: number; value: number } | null;
		pendingNoteToggle?: PendingNoteToggle | null;
		notes?: CellNotes;
		hintStep?: HintStep;
	} = {},
) =>
	renderToStaticMarkup(
		<SudokuGrid
			initialBoard={initialBoard}
			currentBoard={currentBoard}
			notes={options.notes ?? emptyNotes()}
			selectedCell={selectedCell}
			onCellSelect={() => undefined}
			conflicts={options.conflicts ?? []}
			hintStep={options.hintStep}
			pendingValue={options.pendingValue}
			pendingNoteToggle={options.pendingNoteToggle}
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

		const markup = renderGrid(initial, current, [0, 0], { notes });
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
		const markup = renderGrid(initial, current, [0, 0], { notes, hintStep });

		expect(markup).toContain('data-hint-candidate="elimination"');
		expect(markup).not.toContain('data-note-highlight="true"');
		expect(markup).not.toContain("bg-primary/25");
		expect(markup).toContain("text-red-500");
	});

	test("limits iOS gesture suppression to the board surface", () => {
		const markup = renderGrid(emptyBoard(), emptyBoard(), [0, 0]);

		expect(markup).toContain("touch-none");
		expect(markup).toContain("select-none");
		expect(markup).toContain("[-webkit-touch-callout:none]");
		expect(markup).toContain('draggable="false"');
	});

	test("renders a pending value as a neutral large digit without conflict styling", () => {
		const markup = renderGrid(emptyBoard(), emptyBoard(), [0, 0], {
			conflicts: [{ row: 0, col: 0 }],
			pendingValue: { row: 0, col: 0, value: 7 },
		});
		const pending = cellTag(markup, 0, 0);

		expect(pending).toContain('data-pending="true"');
		expect(pending).toContain('data-origin="pending"');
		expect(pending).toContain("text-[var(--player-number)]");
		expect(pending).not.toContain("bg-red-500/80");
		expect(markup).toContain("<span>7</span>");
	});

	test("optimistically hides a note while its removal is awaiting the game-state echo", () => {
		const notes = emptyNotes();
		notes[0]?.[0]?.add(7);
		const markup = renderGrid(emptyBoard(), emptyBoard(), [0, 0], {
			notes,
			pendingNoteToggle: {
				row: 0,
				col: 0,
				value: 7,
				shouldExist: false,
			},
		});

		expect(markup).toContain('data-pending-note="hidden"');
		expect(markup).not.toContain(">7</div>");
	});

	test("optimistically shows a note while its addition is awaiting the game-state echo", () => {
		const markup = renderGrid(emptyBoard(), emptyBoard(), [0, 0], {
			pendingNoteToggle: {
				row: 0,
				col: 0,
				value: 7,
				shouldExist: true,
			},
		});

		expect(markup).toContain('data-pending-note="visible"');
		expect(markup).toContain(">7</div>");
	});
});
