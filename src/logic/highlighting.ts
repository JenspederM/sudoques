import type { Board } from "@/types";

export type CellHighlightState = "none" | "peer" | "matching" | "selected";

/**
 * Returns the strongest visual relationship between a cell and the selection.
 * Matching values take precedence over row, column, and box highlighting.
 */
export function getCellHighlightState(
	currentBoard: Board,
	selectedCell: [number, number] | null,
	row: number,
	col: number,
): CellHighlightState {
	if (selectedCell === null) return "none";

	const [selectedRow, selectedCol] = selectedCell;
	if (selectedRow === row && selectedCol === col) return "selected";

	const selectedValue = currentBoard[selectedRow]?.[selectedCol];
	const currentValue = currentBoard[row]?.[col];

	if (
		selectedValue !== null &&
		selectedValue !== undefined &&
		currentValue === selectedValue
	) {
		return "matching";
	}

	const sharesBox =
		Math.floor(row / 3) === Math.floor(selectedRow / 3) &&
		Math.floor(col / 3) === Math.floor(selectedCol / 3);

	if (row === selectedRow || col === selectedCol || sharesBox) return "peer";

	return "none";
}
