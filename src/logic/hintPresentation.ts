import type {
	ExplainableHint,
	HintCell,
	HintStep,
	HintTechnique,
} from "./explainableSolver";

export type HintDisclosureStage = "technique" | "location" | "details";

export const INITIAL_HINT_DISCLOSURE_STAGE: HintDisclosureStage = "technique";

const STAGE_ORDER: HintDisclosureStage[] = ["technique", "location", "details"];

export function getInitialHintDisclosureStage(
	hint: ExplainableHint,
	stepIndex = 0,
): HintDisclosureStage {
	const step = hint.steps[stepIndex];
	return hint.status === "invalid" || step?.kind === "correction"
		? "details"
		: INITIAL_HINT_DISCLOSURE_STAGE;
}

export function nextHintDisclosureStage(
	stage: HintDisclosureStage,
): HintDisclosureStage {
	const next = STAGE_ORDER[STAGE_ORDER.indexOf(stage) + 1];
	return next ?? stage;
}

export function previousHintDisclosureStage(
	stage: HintDisclosureStage,
): HintDisclosureStage {
	const previous = STAGE_ORDER[STAGE_ORDER.indexOf(stage) - 1];
	return previous ?? stage;
}

function cellKey(cell: { row: number; col: number }) {
	return `${cell.row},${cell.col}`;
}

function locationCells(step: HintStep): HintCell[] {
	const cells = new Map<string, HintCell>();
	for (const cell of step.cells ?? []) cells.set(cellKey(cell), cell);
	for (const candidate of [
		...step.pattern,
		...step.eliminations,
		...(step.placement ? [step.placement] : []),
	]) {
		const key = cellKey(candidate);
		if (!cells.has(key)) {
			cells.set(key, { row: candidate.row, col: candidate.col, role: "focus" });
		}
	}
	return [...cells.values()];
}

/**
 * Keeps board highlights in sync with what the player has chosen to reveal.
 * The location stage highlights cells and houses, but deliberately omits digits,
 * eliminations, and placements until the full hint is requested.
 */
export function getVisibleHintStep(
	step: HintStep | undefined,
	stage: HintDisclosureStage,
): HintStep | null {
	if (!step || stage === "technique") return null;
	if (stage === "details") return step;

	return {
		...step,
		title: "Look at the highlighted area",
		summary: "The next deduction is in the highlighted cells or houses.",
		details: [],
		pattern: [],
		eliminations: [],
		placement: undefined,
		cells: locationCells(step),
	};
}

const SUBSET_EXPLANATIONS: Record<
	"Naked" | "Hidden",
	Record<"Pair" | "Triple" | "Quad", string>
> = {
	Naked: {
		Pair: "Two cells in one row, column, or box contain the same two candidates. Those digits must go in those cells, so they can be removed elsewhere in that area.",
		Triple:
			"Three cells in one row, column, or box share only three candidates. Those digits can be removed from every other cell in that area.",
		Quad: "Four cells in one row, column, or box share only four candidates. Those digits can be removed from every other cell in that area.",
	},
	Hidden: {
		Pair: "Two digits can appear in only the same two cells of a row, column, or box. Other candidates can be removed from those two cells.",
		Triple:
			"Three digits can appear in only the same three cells of a row, column, or box. Other candidates can be removed from those cells.",
		Quad: "Four digits can appear in only the same four cells of a row, column, or box. Other candidates can be removed from those cells.",
	},
};

export function getTechniqueExplanation(technique: HintTechnique): string {
	const subset = /^(Naked|Hidden) (Pair|Triple|Quad)$/.exec(technique);
	if (subset) {
		const [, visibility, size] = subset;
		return SUBSET_EXPLANATIONS[visibility as "Naked" | "Hidden"][
			size as "Pair" | "Triple" | "Quad"
		];
	}

	switch (technique) {
		case "Naked Single":
			return "A cell has only one candidate left after checking its row, column, and box.";
		case "Hidden Single":
			return "A digit has only one possible cell in a row, column, or box, even if that cell still shows other candidates.";
		case "Pointing Pairs":
			return "Inside one box, a candidate is confined to a single row or column. It can be removed from the rest of that row or column outside the box.";
		case "Line/Box Reduction":
			return "In one row or column, every position for a candidate lies inside the same box. It can be removed from the other cells in that box.";
		case "X-Wing":
			return "A candidate occurs in the same two columns of two rows, or the same two rows of two columns. Those four corners remove the candidate elsewhere on the crossed lines.";
		case "Skyscraper":
			return "Two rows or columns each have exactly two places for a candidate, with one pair aligned. At least one of the two unaligned ends must be true, so cells seeing both ends cannot contain that candidate.";
		case "2-String Kite":
			return "A row and a column each have exactly two places for a candidate, with one end of each link meeting in the same box. At least one outer end must be true, so cells seeing both outer ends lose that candidate.";
		case "Swordfish":
			return "A candidate is confined to three matching rows and columns. The candidate can be removed from the other cells on the three crossing lines.";
		case "Jellyfish":
			return "A candidate is confined to four matching rows and columns. The candidate can be removed from the other cells on the four crossing lines.";
		case "Y-Wing":
			return "A pivot cell links two two-candidate cells called pincers. One pincer must contain their shared candidate, so that candidate can be removed from cells that see both pincers.";
		case "XYZ-Wing":
			return "A three-candidate pivot links two two-candidate wings. Their shared candidate must occur in the pivot or a wing, so cells seeing all three cannot contain it.";
		case "Unique Rectangle Type 1":
			return "Four cells could otherwise form a rectangle with two possible solutions. Extra candidates in one corner prevent that ambiguity and allow an elimination.";
		case "Simple Colouring":
			return "Strong links for one digit are alternated between two colours. A contradiction or a cell seeing both colours shows which candidates can be removed.";
		case "XY-Chain":
			return "A chain of two-candidate cells alternates linked digits. The endpoints force one shared candidate, allowing eliminations from cells that see both ends.";
		case "BUG+1":
			return "Every unsolved cell has two candidates except one cell with three. Its extra candidate must be the value placed there.";
		case "Cell Forcing Chain":
			return "Try each candidate in one cell and follow the consequences. Candidates that create a contradiction can be removed; a surviving candidate may be placed.";
		case "Check for mistakes":
			return "An existing entry or note conflicts with the puzzle. Recheck the highlighted cell before asking for another logical hint.";
		default:
			return "This advanced Sudoku technique links candidates across several cells to prove which candidates can be placed or removed.";
	}
}
