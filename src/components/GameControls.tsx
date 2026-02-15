import { Pencil, Redo2, RotateCcw, Undo2 } from "lucide-react";
import type React from "react";
import { cn } from "../lib/utils";

interface GameControlsProps {
	isNoteMode: boolean;
	onToggleNoteMode: () => void;
	onUndo: () => void;
	onRedo: () => void;
	onRestart: () => void;
	canUndo: boolean;
	canRedo: boolean;
}

export const GameControls: React.FC<GameControlsProps> = ({
	isNoteMode,
	onToggleNoteMode,
	onUndo,
	onRedo,
	onRestart,
	canUndo,
	canRedo,
}) => {
	return (
		<div className="flex items-center justify-between w-full py-0 sm:py-4 gap-2 sm:gap-4 shrink-0">
			<div className="flex gap-2">
				<button
					type="button"
					data-testid="undo-button"
					onClick={onUndo}
					disabled={!canUndo}
					className={cn(
						"p-2 sm:p-3 rounded-full glass hover:bg-white/10 transition-all",
						!canUndo && "opacity-30 cursor-not-allowed",
					)}
					title="Undo"
				>
					<Undo2 size={24} />
				</button>
				<button
					type="button"
					data-testid="redo-button"
					onClick={onRedo}
					disabled={!canRedo}
					className={cn(
						"p-2 sm:p-3 rounded-full glass hover:bg-white/10 transition-all",
						!canRedo && "opacity-30 cursor-not-allowed",
					)}
					title="Redo"
				>
					<Redo2 size={24} />
				</button>
			</div>

			<button
				type="button"
				data-testid="note-toggle"
				onClick={onToggleNoteMode}
				className={cn(
					"flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 rounded-full transition-all duration-300",
					isNoteMode
						? "bg-brand-primary text-white shadow-lg shadow-brand-primary/40 ring-2 ring-brand-primary/50"
						: "glass text-slate-400 hover:text-white hover:bg-white/10",
				)}
			>
				<Pencil size={20} className={isNoteMode ? "animate-bounce" : ""} />
				<span className="font-semibold uppercase tracking-wider text-sm">
					{isNoteMode ? "Notes On" : "Notes Off"}
				</span>
			</button>

			<button
				type="button"
				data-testid="restart-button"
				onClick={onRestart}
				className="p-2 sm:p-3 rounded-full glass hover:bg-red-500/10 hover:text-red-400 transition-all"
				title="Restart"
			>
				<RotateCcw size={24} />
			</button>
		</div>
	);
};
