import { m } from "framer-motion";
import type { HTMLProps } from "react";
import { cn } from "@/lib/utils";
import { getCellHighlightState } from "@/logic/highlighting";
import type { Board, CellNotes } from "@/types";

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
	const isInitial = (r: number, c: number) => {
		const row = initialBoard[r];
		return row ? row[c] !== null : false;
	};
	const hasConflict = (r: number, c: number) =>
		conflicts.some((conf) => conf.row === r && conf.col === c);

	return (
		<div
			className={cn(
				"relative grid grid-cols-9 gap-[1px] p-[1px] rounded-lg overflow-hidden aspect-square w-full bg-primary/30",
				className,
			)}
		>
			{(currentBoard as (number | null)[][]).map(
				(row: (number | null)[], r: number) =>
					row.map((val: number | null, c: number) => {
						const highlightState = getCellHighlightState(
							currentBoard,
							selectedCell,
							r,
							c,
						);
						const selected = highlightState === "selected";
						const matching = highlightState === "matching";
						const peer = highlightState === "peer";
						const initial = isInitial(r, c);
						const conflict = hasConflict(r, c);

						return (
							<m.div
								// biome-ignore lint/suspicious/noArrayIndexKey: Indices are stable for Sudoku grid
								key={`cell-${r}-${c}`}
								data-testid={`cell-${r}-${c}`}
								data-highlight={highlightState}
								whileTap={{ scale: 0.95 }}
								onClick={() => onCellSelect(r, c)}
								className={cn(
									"relative flex items-center justify-center aspect-square text-lg sm:text-2xl cursor-pointer select-none",
									"bg-background text-primary/90 font-semibold",
									r === 8 && c === 8 && "rounded-br-md",
									r === 8 && c === 0 && "rounded-bl-md",
									r === 0 && c === 8 && "rounded-tr-md",
									r === 0 && c === 0 && "rounded-tl-md",
									peer && "bg-primary/10",
									matching &&
										"bg-primary/30 text-foreground font-bold ring-1 ring-inset ring-primary/60",
									selected &&
										"bg-primary/50 text-foreground font-bold ring-2 ring-inset ring-primary z-10",
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
														selected && "text-foreground",
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
			<div
				aria-hidden="true"
				data-testid="box-dividers"
				className="pointer-events-none absolute inset-0 z-20"
			>
				<div className="absolute inset-y-0 left-[33.333333%] w-[2px] -translate-x-1/2 bg-[var(--grid-line)]" />
				<div className="absolute inset-y-0 left-[66.666667%] w-[2px] -translate-x-1/2 bg-[var(--grid-line)]" />
				<div className="absolute inset-x-0 top-[33.333333%] h-[2px] -translate-y-1/2 bg-[var(--grid-line)]" />
				<div className="absolute inset-x-0 top-[66.666667%] h-[2px] -translate-y-1/2 bg-[var(--grid-line)]" />
			</div>
		</div>
	);
};
