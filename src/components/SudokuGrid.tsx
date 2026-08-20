import { m } from "framer-motion";
import { type HTMLProps, useEffect, useRef, useState } from "react";
import { CellGestureNumpad } from "@/components/CellGestureNumpad";
import {
	type CellGestureCommit,
	type CellGestureMode,
	createCellGestureNumpadController,
	type OpenCellGesture,
} from "@/lib/cellGestureNumpad";
import type {
	PendingNoteToggle,
	PendingNumberInput,
} from "@/lib/doubleTapInput";
import { cn } from "@/lib/utils";
import type { HintStep } from "@/logic/explainableSolver";
import {
	getCellHighlightState,
	isMatchingNoteCandidate,
} from "@/logic/highlighting";
import type { Board, CellNotes } from "@/types";

type SudokuGridProps = HTMLProps<HTMLDivElement> & {
	initialBoard: Board;
	currentBoard: Board;
	notes: CellNotes;
	selectedCell: [number, number] | null;
	onCellSelect: (row: number, col: number) => void;
	conflicts: { row: number; col: number }[];
	hintStep?: HintStep | null;
	pendingValue?: PendingNumberInput | null;
	pendingNoteToggle?: PendingNoteToggle | null;
	isNoteMode?: boolean;
	disabledNumbers?: number[];
	gestureDisabled?: boolean;
	onCellGestureArm?: (mode: CellGestureMode) => void;
	onCellGestureDisarm?: () => void;
	onCellGestureFocus?: (row: number, col: number) => void;
	onCellGestureCommit?: (input: CellGestureCommit) => void;
};

const EMPTY_DISABLED_NUMBERS: number[] = [];

const getVisualViewportBounds = () => {
	const visualViewport = window.visualViewport;
	if (visualViewport) {
		return {
			left: visualViewport.offsetLeft,
			top: visualViewport.offsetTop,
			width: visualViewport.width,
			height: visualViewport.height,
		};
	}
	return {
		left: 0,
		top: 0,
		width: window.innerWidth,
		height: window.innerHeight,
	};
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
	pendingValue,
	pendingNoteToggle,
	isNoteMode = false,
	disabledNumbers = EMPTY_DISABLED_NUMBERS,
	gestureDisabled = false,
	onCellGestureArm,
	onCellGestureDisarm,
	onCellGestureFocus,
	onCellGestureCommit,
}: SudokuGridProps) => {
	const [openGesture, setOpenGesture] = useState<OpenCellGesture | null>(null);
	const gesturePropsRef = useRef({
		onCellSelect,
		onCellGestureArm,
		onCellGestureDisarm,
		onCellGestureFocus,
		onCellGestureCommit,
	});
	gesturePropsRef.current = {
		onCellSelect,
		onCellGestureArm,
		onCellGestureDisarm,
		onCellGestureFocus,
		onCellGestureCommit,
	};
	const gestureControllerRef = useRef<ReturnType<
		typeof createCellGestureNumpadController
	> | null>(null);
	if (!gestureControllerRef.current) {
		gestureControllerRef.current = createCellGestureNumpadController({
			callbacks: {
				onArm: (mode) => gesturePropsRef.current.onCellGestureArm?.(mode),
				onDisarm: () => gesturePropsRef.current.onCellGestureDisarm?.(),
				onOpenChange: setOpenGesture,
				onFocusTarget: ({ row, col }) =>
					gesturePropsRef.current.onCellGestureFocus?.(row, col),
				onSelect: ({ row, col }) =>
					gesturePropsRef.current.onCellSelect(row, col),
				onCommit: (input) =>
					gesturePropsRef.current.onCellGestureCommit?.(input),
			},
		});
	}
	const gestureController = gestureControllerRef.current;

	useEffect(() => {
		const cancelGesture = () => gestureController.cancel();
		const handleVisibilityChange = () => {
			if (document.visibilityState !== "visible") cancelGesture();
		};
		window.addEventListener("blur", cancelGesture);
		document.addEventListener("visibilitychange", handleVisibilityChange);
		window.visualViewport?.addEventListener("resize", cancelGesture);
		window.visualViewport?.addEventListener("scroll", cancelGesture);
		return () => {
			window.removeEventListener("blur", cancelGesture);
			document.removeEventListener("visibilitychange", handleVisibilityChange);
			window.visualViewport?.removeEventListener("resize", cancelGesture);
			window.visualViewport?.removeEventListener("scroll", cancelGesture);
			gestureController.dispose();
		};
	}, [gestureController]);

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
	const releasePointerCapture = (
		element: HTMLDivElement,
		pointerId: number,
	) => {
		try {
			if (element.hasPointerCapture(pointerId)) {
				element.releasePointerCapture(pointerId);
			}
		} catch {
			// Pointer capture can disappear when iOS interrupts a gesture.
		}
	};

	return (
		<div
			data-testid="sudoku-grid"
			className={cn(
				"relative isolate grid grid-cols-9 gap-[1px] p-[1px] rounded-lg overflow-hidden aspect-square w-full bg-[var(--grid-line)] touch-none select-none [-webkit-touch-callout:none]",
				className,
			)}
		>
			{(currentBoard as (number | null)[][]).map(
				(row: (number | null)[], r: number) =>
					row.map((val: number | null, c: number) => {
						const pending = pendingValue?.row === r && pendingValue.col === c;
						const displayValue = pending ? pendingValue.value : val;
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
						const conflict = !pending && hasConflict(r, c);
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
								data-pending={pending || undefined}
								data-origin={
									initial
										? "given"
										: pending
											? "pending"
											: playerEntered
												? "player"
												: "empty"
								}
								draggable={false}
								onContextMenu={(event) => event.preventDefault()}
								onDragStart={(event) => event.preventDefault()}
								whileTap={{ scale: 0.95 }}
								onClick={(event) => {
									// Pointer input is handled on release so it cannot fire twice.
									if (event.detail === 0) onCellSelect(r, c);
								}}
								onPointerDown={(event) => {
									if (
										!event.isPrimary ||
										(event.pointerType === "mouse" && event.button !== 0)
									)
										return;
									event.preventDefault();
									try {
										event.currentTarget.setPointerCapture(event.pointerId);
									} catch {
										// Selection still works if an older browser lacks capture.
									}
									const rect = event.currentTarget.getBoundingClientRect();
									const editable =
										Boolean(onCellGestureCommit) &&
										!gestureDisabled &&
										!initial;
									gestureController.pointerDown({
										pointerId: event.pointerId,
										row: r,
										col: c,
										x: event.clientX,
										y: event.clientY,
										time: event.timeStamp,
										cellRect: {
											left: rect.left,
											top: rect.top,
											width: rect.width,
											height: rect.height,
										},
										viewport: getVisualViewportBounds(),
										globalNoteMode: isNoteMode,
										canEnterValue: editable,
										canEnterNote: editable && val === null,
										disabledNumbers,
									});
								}}
								onPointerMove={(event) => {
									if (!gestureController.hasActivePointer(event.pointerId))
										return;
									event.preventDefault();
									gestureController.pointerMove({
										pointerId: event.pointerId,
										x: event.clientX,
										y: event.clientY,
										time: event.timeStamp,
									});
								}}
								onPointerUp={(event) => {
									if (!gestureController.hasActivePointer(event.pointerId))
										return;
									event.preventDefault();
									gestureController.pointerUp({
										pointerId: event.pointerId,
										x: event.clientX,
										y: event.clientY,
										time: event.timeStamp,
									});
									releasePointerCapture(event.currentTarget, event.pointerId);
								}}
								onPointerCancel={(event) => {
									if (!gestureController.hasActivePointer(event.pointerId))
										return;
									gestureController.cancel();
									releasePointerCapture(event.currentTarget, event.pointerId);
								}}
								onLostPointerCapture={(event) => {
									if (gestureController.hasActivePointer(event.pointerId)) {
										gestureController.cancel();
									}
								}}
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
									pending && "text-[var(--player-number)]",
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
								{displayValue !== null ? (
									<span>{displayValue}</span>
								) : (
									<div className="grid grid-cols-3 grid-rows-3 w-full h-full p-[2px] text-[8px] sm:text-[10px] leading-tight text-muted-foreground">
										{Array.from({ length: 9 }).map((_, i) => {
											const rowNotes = notes[r];
											const cellNotes = rowNotes ? rowNotes[c] : null;
											const value = i + 1;
											const hintRole = hintCandidateRole(r, c, value);
											const matchingNote = isMatchingNoteCandidate(
												currentBoard,
												notes,
												selectedCell,
												r,
												c,
												value,
											);
											const highlightMatchingNote = matchingNote && !hintRole;
											const pendingNoteMatches =
												pendingNoteToggle?.row === r &&
												pendingNoteToggle.col === c &&
												pendingNoteToggle.value === value;
											const showCandidate = pendingNoteMatches
												? pendingNoteToggle.shouldExist
												: (cellNotes?.has(value) ?? false) || hintRole !== null;
											return (
												<div
													// biome-ignore lint/suspicious/noArrayIndexKey: Indices are stable for Sudoku grid
													key={`note-${i}`}
													data-hint-candidate={hintRole ?? undefined}
													data-note-highlight={
														highlightMatchingNote || undefined
													}
													data-pending-note={
														pendingNoteMatches
															? pendingNoteToggle.shouldExist
																? "visible"
																: "hidden"
															: undefined
													}
													className={cn(
														"flex items-center justify-center text-[var(--player-number)]",
														highlightMatchingNote &&
															"rounded-sm bg-primary/25 text-primary font-black ring-1 ring-inset ring-primary/60",
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
													{showCandidate ? value : ""}
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
			<CellGestureNumpad gesture={openGesture} />
		</div>
	);
};
