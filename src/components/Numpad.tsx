import { Delete } from "lucide-react";
import type React from "react";
import { useEffect, useRef } from "react";
import { createPressAndHoldController } from "@/lib/pressAndHold";
import { cn } from "@/lib/utils";

interface NumpadProps {
	onNumberClick: (num: number | null) => void;
	onQuickNote: (num: number) => void;
	isNoteMode: boolean;
	disabled?: boolean;
	disabledNumbers?: number[];
	remainingCounts?: Map<number, number>;
}

const NumpadButton: React.FC<{
	num: number;
	disabled: boolean;
	isNoteMode: boolean;
	remaining?: number;
	onClick: () => void;
	onLongPress: () => void;
}> = ({ num, disabled, isNoteMode, remaining, onClick, onLongPress }) => {
	const pressController = useRef(createPressAndHoldController());

	useEffect(() => () => pressController.current.dispose(), []);

	const releasePointer = (event: React.PointerEvent<HTMLButtonElement>) => {
		pressController.current.end();
		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
	};

	return (
		<button
			type="button"
			data-testid={`numpad-${num}`}
			data-note-mode={isNoteMode}
			aria-describedby="quick-note-help"
			aria-label={
				isNoteMode
					? `Toggle note ${num}`
					: `Enter ${num}. Press and hold to toggle note ${num}`
			}
			onPointerDown={(event) => {
				if (!event.isPrimary || event.button !== 0) return;
				try {
					event.currentTarget.setPointerCapture(event.pointerId);
				} catch {
					// Pointer capture is best-effort; the hold still works without it.
				}
				pressController.current.start(
					{ x: event.clientX, y: event.clientY },
					onLongPress,
				);
			}}
			onPointerMove={(event) =>
				pressController.current.move({ x: event.clientX, y: event.clientY })
			}
			onPointerUp={releasePointer}
			onPointerCancel={releasePointer}
			onBlur={() => pressController.current.end()}
			onContextMenu={(event) => event.preventDefault()}
			onDragStart={(event) => event.preventDefault()}
			onClick={(event) => {
				if (pressController.current.consumeClick()) {
					event.preventDefault();
					return;
				}
				onClick();
			}}
			disabled={disabled}
			className={cn(
				"numpad-key aspect-16/12 sm:aspect-square flex flex-col items-center justify-center rounded-xl glass transition-all active:scale-95 touch-manipulation select-none [-webkit-touch-callout:none]",
				"hover:bg-primary/20 hover:border-primary/50 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
				disabled && "opacity-30 cursor-not-allowed",
			)}
		>
			<span className="text-xl sm:text-2xl font-semibold leading-none">
				{num}
			</span>
			{remaining !== undefined && (
				<span className="text-[10px] sm:text-xs leading-none mt-0.5 text-muted-foreground font-medium">
					{remaining}
				</span>
			)}
		</button>
	);
};

const EMPTY_NUMBERS: number[] = [];

export const Numpad: React.FC<NumpadProps> = ({
	onNumberClick,
	onQuickNote,
	isNoteMode,
	disabled = false,
	disabledNumbers = EMPTY_NUMBERS,
	remainingCounts,
}) => {
	const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];

	return (
		<fieldset
			className="grid grid-cols-5 gap-1.5 sm:gap-2 w-full shrink-0 border-0 p-0 m-0 min-w-0"
			aria-disabled={disabled}
			aria-label={
				isNoteMode ? "Number pad, notes mode" : "Number pad, value mode"
			}
			aria-describedby="quick-note-help"
			data-input-mode={isNoteMode ? "notes" : "values"}
		>
			{/* 1 2 3 4 5 */}
			{numbers.slice(0, 5).map((num) => (
				<NumpadButton
					key={num}
					num={num}
					disabled={disabled || disabledNumbers.includes(num)}
					isNoteMode={isNoteMode}
					remaining={remainingCounts?.get(num)}
					onClick={() => onNumberClick(num)}
					onLongPress={() => onQuickNote(num)}
				/>
			))}

			{/* 6 7 8 9 x */}
			{numbers.slice(5).map((num) => (
				<NumpadButton
					key={num}
					num={num}
					disabled={disabled || disabledNumbers.includes(num)}
					isNoteMode={isNoteMode}
					remaining={remainingCounts?.get(num)}
					onClick={() => onNumberClick(num)}
					onLongPress={() => onQuickNote(num)}
				/>
			))}
			<button
				type="button"
				data-testid="numpad-delete"
				aria-label="Erase selected cell"
				disabled={disabled}
				onClick={() => onNumberClick(null)}
				className={cn(
					"aspect-16/12 sm:aspect-square flex items-center justify-center text-xl sm:text-2xl font-semibold rounded-xl glass transition-all active:scale-95 bg-red-500/10 hover:bg-red-500/20 hover:border-red-500/50 text-red-400",
					disabled &&
						"opacity-30 cursor-not-allowed hover:bg-red-500/10 active:scale-100",
				)}
			>
				<Delete size={24} />
			</button>
		</fieldset>
	);
};
