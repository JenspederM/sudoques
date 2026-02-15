import { motion } from "framer-motion";
import type React from "react";
import { cn } from "../lib/utils";
import type { Board, CellNotes } from "../logic/sudoku";

interface SudokuGridProps {
	initialBoard: Board;
	currentBoard: Board;
	notes: CellNotes;
	selectedCell: [number, number] | null;
	onCellSelect: (row: number, col: number) => void;
	conflicts: { row: number; col: number }[];
}

export const SudokuGrid: React.FC<SudokuGridProps> = ({
	initialBoard,
	currentBoard,
	notes,
	selectedCell,
	onCellSelect,
	conflicts,
}) => {
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
		<div className="grid grid-cols-9 gap-[1px] p-[1px] rounded-lg glass aspect-square w-full shrink-0 overflow-hidden">
			{currentBoard.map((row, r) =>
				row.map((val, c) => {
					const selected = isSelected(r, c);
					const highlighted = isHighlighted(r, c);
					const initial = isInitial(r, c);
					const conflict = hasConflict(r, c);

					return (
						<motion.div
							// biome-ignore lint/suspicious/noArrayIndexKey: Indices are stable for Sudoku grid
							key={`cell-${r}-${c}`}
							data-testid={`cell-${r}-${c}`}
							whileTap={{ scale: 0.95 }}
							onClick={() => onCellSelect(r, c)}
							className={cn(
								"relative flex items-center justify-center aspect-square text-lg sm:text-2xl cursor-pointer transition-all duration-200 select-none",
								"bg-glass",
								r % 3 === 2 && r !== 8 && "border-b-2 border-white/30",
								c % 3 === 2 && c !== 8 && "border-r-2 border-white/30",
								r === 8 && c === 8 && "rounded-br-md",
								r === 8 && c === 0 && "rounded-bl-md",
								r === 0 && c === 8 && "rounded-tr-md",
								r === 0 && c === 0 && "rounded-tl-md",
								highlighted && !selected && !conflict && "bg-brand-primary/20",
								selected &&
									!conflict &&
									"bg-brand-primary/40 ring-2 ring-brand-primary z-10",
								conflict &&
									"text-white bg-red-500/50 ring-2 ring-red-500 z-20 animate-pulse",
								!initial && !conflict && "text-brand-secondary font-semibold",
								initial && !conflict && "text-white font-bold",
							)}
						>
							{val !== null ? (
								<span>{val}</span>
							) : (
								<div className="grid grid-cols-3 grid-rows-3 w-full h-full p-[2px] text-[8px] sm:text-[10px] leading-tight text-slate-400">
									{Array.from({ length: 9 }).map((_, i) => {
										const rowNotes = notes[r];
										const cellNotes = rowNotes ? rowNotes[c] : null;
										return (
											<div
												// biome-ignore lint/suspicious/noArrayIndexKey: Indices are stable for Sudoku grid
												key={`note-${i}`}
												className="flex items-center justify-center"
											>
												{cellNotes?.has(i + 1) ? i + 1 : ""}
											</div>
										);
									})}
								</div>
							)}
						</motion.div>
					);
				}),
			)}
		</div>
	);
};
