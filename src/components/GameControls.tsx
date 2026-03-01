import { Pencil, Redo2, Undo2 } from "lucide-react";
import type React from "react";
import { cn } from "@/lib/utils";

interface GameControlsProps {
	isNoteMode: boolean;
	onToggleNoteMode: () => void;
	onUndo: () => void;
	onRedo: () => void;
	canUndo: boolean;
	canRedo: boolean;
}

export const GameControls: React.FC<GameControlsProps> = ({
	isNoteMode,
	onToggleNoteMode,
	onUndo,
	onRedo,
	canUndo,
	canRedo,
}) => {
	return (
		<div className="grid grid-cols-[1fr_auto_1fr] items-center w-full py-0 sm:py-4 gap-2 sm:gap-4 shrink-0">
			<div className="flex gap-2 justify-start">
				<button
					type="button"
					data-testid="undo-button"
					onClick={onUndo}
					disabled={!canUndo}
					className={cn(
						"p-2 sm:p-3 rounded-full glass text-muted-foreground hover:bg-accent hover:text-foreground transition-all",
						!canUndo && "opacity-30 cursor-not-allowed",
					)}
					title="Undo"
				>
					<Undo2 size={20} />
				</button>
				<button
					type="button"
					data-testid="redo-button"
					onClick={onRedo}
					disabled={!canRedo}
					className={cn(
						"p-2 sm:p-3 rounded-full glass text-muted-foreground hover:bg-accent hover:text-foreground transition-all",
						!canRedo && "opacity-30 cursor-not-allowed",
					)}
					title="Redo"
				>
					<Redo2 size={20} />
				</button>
			</div>

			<div className="flex justify-center">
				<button
					type="button"
					data-testid="note-toggle"
					onClick={onToggleNoteMode}
					className={cn(
						"flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 rounded-full transition-all duration-300",
						isNoteMode
							? "bg-primary text-white shadow-lg shadow-primary/40 ring-2 ring-primary/50"
							: "glass text-muted-foreground hover:text-primary hover:bg-primary/10",
					)}
				>
					<Pencil size={20} className={isNoteMode ? "animate-bounce" : ""} />
					<span className="font-semibold uppercase tracking-wider text-sm">
						{isNoteMode ? "Notes On" : "Notes Off"}
					</span>
				</button>
			</div>

			<div className="flex justify-end" />
		</div>
	);
};
