import { m } from "framer-motion";
import type { HTMLProps } from "react";
import { cn } from "@/lib/utils";
import type { HintStep } from "@/logic/explainableSolver";
import type { Board, CellNotes } from "@/types";

type SudokuGridProps = HTMLProps<HTMLDivElement> & {
	initialBoard: Board;
	currentBoard: Board;
	notes: CellNotes;
	selectedCell: [number, number] | null;
	onCellSelect: (row: number, col: number) => void;
	conflicts: { row: number; col: number }[];
	hintStep?: HintStep | null;
};

export const SudokuGrid = ({
	className,
	initialBoard,
	currentBoard,
	notes,
	selectedCell,
	onCellSelect,
	conflicts,
	hintStep,
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
	const isHintHouse = (row: number, col: number) =>
		hintStep?.houses?.some((house) => {
			if (house.type === "row") return row === house.index;
			if (house.type === "column") return col === house.index;
			return Math.floor(row / 3) * 3 + Math.floor(col / 3) === house.index;
		}) ?? false;
	const hintCandidateRole = (row: number, col: number, value: number) => {
		if (
			hintStep?.placement?.row === row &&
			hintStep.placement.col === col &&
			hintStep.placement.value === value
		)
			return "placement" as const;
		if (
			hintStep?.eliminations.some(
				(candidate) =>
					candidate.row === row &&
					candidate.col === col &&
					candidate.value === value,
			)
		)
			return "elimination" as const;
		const pattern = hintStep?.pattern.find(
			(candidate) =>
				candidate.row === row &&
				candidate.col === col &&
				candidate.value === value,
		);
		if (pattern)
			return pattern.group === "b"
				? ("pattern-b" as const)
				: ("pattern-a" as const);
		return null;
	};

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
						const hintHouse = isHintHouse(r, c);
						const hintPattern = hintStep?.pattern.some(
							(candidate) => candidate.row === r && candidate.col === c,
						);
						const hintElimination = hintStep?.eliminations.some(
							(candidate) => candidate.row === r && candidate.col === c,
						);
						const hintPlacement =
							hintStep?.placement?.row === r && hintStep.placement.col === c;
						const hintCell = hintStep?.cells?.find(
							(cell) => cell.row === r && cell.col === c,
						);

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
									highlighted && !selected && "bg-background/50",
									selected &&
										"bg-primary/10 ring ring-primary border border-primary z-10",
									highlighted && "text-primary font-semibold",
									initial && "text-foreground font-bold",
									hintHouse && "bg-primary/5",
									hintPattern && "bg-sky-500/15",
									hintElimination && "bg-red-500/15",
									hintPlacement &&
										"bg-emerald-500/20 ring-2 ring-inset ring-emerald-500 z-20",
									hintCell?.role === "focus" &&
										"ring-2 ring-inset ring-primary z-20",
									hintCell?.role === "warning" &&
										"bg-red-500/20 ring-2 ring-inset ring-red-500 z-20",
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
											const value = i + 1;
											const hintRole = hintCandidateRole(r, c, value);
											return (
												<div
													// biome-ignore lint/suspicious/noArrayIndexKey: Indices are stable for Sudoku grid
													key={`note-${i}`}
													data-hint-candidate={hintRole ?? undefined}
													className={cn(
														"flex items-center justify-center text-primary/80",
														highlighted && "text-primary",
														hintRole === "pattern-a" &&
															"text-sky-500 font-black",
														hintRole === "pattern-b" &&
															"text-violet-500 font-black",
														hintRole === "elimination" &&
															"text-red-500 font-black line-through decoration-2",
														hintRole === "placement" &&
															"text-emerald-500 font-black scale-125",
													)}
												>
													{cellNotes?.has(value) || hintRole ? value : ""}
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
