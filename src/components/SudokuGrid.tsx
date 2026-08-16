import { m } from "framer-motion";
import type { HTMLProps } from "react";
import { cn } from "@/lib/utils";
import type { HintStep } from "@/logic/explainableSolver";
import { getCellHighlightState } from "@/logic/highlighting";
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
			data-testid="sudoku-grid"
			className={cn(
				"relative isolate grid grid-cols-9 gap-[1px] p-[1px] rounded-lg overflow-hidden aspect-square w-full bg-[var(--grid-line)]",
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
						const playerEntered = val !== null && !initial;
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
								data-highlight={highlightState}
								data-origin={
									initial ? "given" : playerEntered ? "player" : "empty"
								}
								whileTap={{ scale: 0.95 }}
								onClick={() => onCellSelect(r, c)}
								className={cn(
									"relative flex items-center justify-center aspect-square text-lg sm:text-2xl cursor-pointer select-none",
									"bg-background font-semibold",
									r === 8 && c === 8 && "rounded-br-md",
									r === 8 && c === 0 && "rounded-bl-md",
									r === 0 && c === 8 && "rounded-tr-md",
									r === 0 && c === 0 && "rounded-tl-md",
									peer && "bg-primary/[0.08]",
									matching &&
										"bg-primary/[0.16] ring-1 ring-inset ring-primary/70 z-30",
									selected &&
										"bg-primary/[0.28] ring-2 ring-inset ring-primary z-30",
									initial && "text-foreground font-bold",
									playerEntered && "text-[var(--player-number)]",
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
										"text-foreground bg-red-500/80 ring ring-red-500 border border-red-500 animate-pulse z-30",
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
														"flex items-center justify-center text-[var(--player-number)]",
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
			<div
				aria-hidden="true"
				data-testid="box-dividers"
				className="pointer-events-none absolute inset-0 z-20"
			>
				<div className="absolute inset-y-0 left-[33.333333%] w-[2px] -translate-x-1/2 bg-[var(--grid-divider)]" />
				<div className="absolute inset-y-0 left-[66.666667%] w-[2px] -translate-x-1/2 bg-[var(--grid-divider)]" />
				<div className="absolute inset-x-0 top-[33.333333%] h-[2px] -translate-y-1/2 bg-[var(--grid-divider)]" />
				<div className="absolute inset-x-0 top-[66.666667%] h-[2px] -translate-y-1/2 bg-[var(--grid-divider)]" />
			</div>
		</div>
	);
};
