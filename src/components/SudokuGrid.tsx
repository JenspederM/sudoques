import { m } from "framer-motion";
import type { HTMLProps } from "react";
import type { Board, CellNotes } from "@/types";
import { cn } from "../lib/utils";

type SudokuGridProps = HTMLProps<HTMLDivElement> & {
	initialBoard: Board;
	currentBoard: Board;
	notes: CellNotes;
	selectedCell: [number, number] | null;
	onCellSelect: (row: number, col: number) => void;
	conflicts: { row: number; col: number }[];
};

export const SudokuGrid = ({
	className,
	initialBoard,
	currentBoard,
	notes,
	selectedCell,
	onCellSelect,
	conflicts,
}: SudokuGridProps) => {
	const isSelected = (r: number, c: number) =>
		selectedCell?.[0] === r && selectedCell?.[1] === c;
	const isHighlighted = (r: number, c: number) => {
		if (selectedCell === null) return false;
		const [sr, sc] = selectedCell;
		const selectedRow = currentBoard[sr];
		const currentRow = currentBoard[r];

		const selectedValue = selectedRow ? selectedRow[sc] : null;
		const currentValue = currentRow ? currentRow[c] : null;

		// Highlight if it's the same number
		// We explicitly check selectedValue !== null because we don't want to highlight all empty cells when an empty cell is selected
		if (
			selectedValue !== null &&
			selectedValue !== undefined &&
			currentValue === selectedValue
		) {
			return true;
		}

		return (
			sr === r ||
			sc === c ||
			(Math.floor(r / 3) === Math.floor(sr / 3) &&
				Math.floor(c / 3) === Math.floor(sc / 3))
		);
	};
	const isInitial = (r: number, c: number) => {
		const row = initialBoard[r];
		return row ? row[c] !== null : false;
	};
	const hasConflict = (r: number, c: number) =>
		conflicts.some((conf) => conf.row === r && conf.col === c);

	return (
		<div
			className={cn(
				"grid grid-cols-9 gap-[1px] p-[1px] rounded-lg aspect-square w-full bg-primary/30",
				className,
			)}
		>
			{(currentBoard as (number | null)[][]).map(
				(row: (number | null)[], r: number) =>
					row.map((val: number | null, c: number) => {
						const selected = isSelected(r, c);
						const highlighted = isHighlighted(r, c);
						const initial = isInitial(r, c);
						const conflict = hasConflict(r, c);

						return (
							<m.div
								// biome-ignore lint/suspicious/noArrayIndexKey: Indices are stable for Sudoku grid
								key={`cell-${r}-${c}`}
								data-testid={`cell-${r}-${c}`}
								whileTap={{ scale: 0.95 }}
								onClick={() => onCellSelect(r, c)}
								className={cn(
									"relative flex items-center justify-center aspect-square text-lg sm:text-2xl cursor-pointer select-none",
									"bg-background text-primary/90 font-semibold",
									r % 3 === 2 && r !== 8 && "border-b-2 border-primary/20",
									c % 3 === 2 && c !== 8 && "border-r-2 border-primary/20",
									r === 8 && c === 8 && "rounded-br-md",
									r === 8 && c === 0 && "rounded-bl-md",
									r === 0 && c === 8 && "rounded-tr-md",
									r === 0 && c === 0 && "rounded-tl-md",
									highlighted && !selected && "bg-background/60",
									selected &&
										"bg-primary/10 ring ring-primary border border-primary z-10",
									highlighted && "text-primary font-semibold",
									initial && "text-foreground font-bold",
									conflict &&
										"text-foreground bg-red-500/80 ring ring-red-500 border border-red-500 animate-pulse",
								)}
							>
								{val !== null ? (
									<span>{val}</span>
								) : (
									<div className="grid grid-cols-3 grid-rows-3 w-full h-full p-[2px] text-[8px] sm:text-[10px] leading-tight text-muted-foreground">
										{Array.from({ length: 9 }).map((_, i) => {
											const rowNotes = notes[r];
											const cellNotes = rowNotes ? rowNotes[c] : null;
											return (
												<div
													// biome-ignore lint/suspicious/noArrayIndexKey: Indices are stable for Sudoku grid
													key={`note-${i}`}
													className={cn(
														"flex items-center justify-center text-primary/80",
														highlighted && "text-primary",
													)}
												>
													{cellNotes?.has(i + 1) ? i + 1 : ""}
												</div>
											);
										})}
									</div>
								)}
							</m.div>
						);
					}),
			)}
		</div>
	);
};
