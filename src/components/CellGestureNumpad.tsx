import { createPortal } from "react-dom";
import type { OpenCellGesture } from "@/lib/cellGestureNumpad";
import { cn } from "@/lib/utils";

export function CellGestureNumpadSurface({
	gesture,
}: {
	gesture: OpenCellGesture;
}) {
	return (
		<div
			aria-hidden="true"
			data-testid="cell-gesture-numpad"
			data-input-mode={gesture.mode}
			className={cn(
				"fixed z-[100] pointer-events-none rounded-2xl p-2 shadow-2xl backdrop-blur-xl ring-1 ring-inset",
				gesture.mode === "note"
					? "ring-primary/80 bg-primary/20 shadow-primary/25"
					: "ring-border bg-card/95 shadow-black/35",
			)}
			style={{
				left: gesture.layout.left,
				top: gesture.layout.top,
				width: gesture.layout.width,
				height: gesture.layout.height,
				display: "grid",
				gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
				gridTemplateRows: "repeat(3, minmax(0, 1fr))",
				gap: gesture.layout.gap,
			}}
		>
			{gesture.layout.keys.map(({ value }) => {
				const disabled = gesture.disabledNumbers.includes(value);
				const active = gesture.activeValue === value;
				return (
					<div
						key={value}
						data-testid={`cell-gesture-key-${value}`}
						data-active={active || undefined}
						data-disabled={disabled || undefined}
						className={cn(
							"flex items-center justify-center rounded-xl border text-xl font-bold tabular-nums",
							"border-border/80 bg-background/90 text-foreground",
							gesture.mode === "note" &&
								"border-primary/45 text-[var(--player-number)]",
							disabled && "opacity-25",
							active &&
								"scale-110 border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/40",
						)}
					>
						{value}
					</div>
				);
			})}
		</div>
	);
}

export function CellGestureNumpad({
	gesture,
}: {
	gesture: OpenCellGesture | null;
}) {
	if (!gesture || typeof document === "undefined") return null;
	return createPortal(
		<CellGestureNumpadSurface gesture={gesture} />,
		document.body,
	);
}
