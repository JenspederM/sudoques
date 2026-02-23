import { useEffect } from "react";

interface UseGameKeyboardProps {
	showWin: boolean;
	setSelectedCell: React.Dispatch<
		React.SetStateAction<[number, number] | null>
	>;
	handleInput: (num: number | null) => void;
	setIsNoteMode: React.Dispatch<React.SetStateAction<boolean>>;
	undo: () => void;
	redo: () => void;
}

export function useGameKeyboard({
	showWin,
	setSelectedCell,
	handleInput,
	setIsNoteMode,
	undo,
	redo,
}: UseGameKeyboardProps) {
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Don't handle keyboard if a dialog is open
			if (showWin) return;

			// Navigation
			if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
				e.preventDefault();
				setSelectedCell((prev) => {
					if (!prev) return [0, 0];
					const [r, c] = prev;
					let nr = r;
					let nc = c;
					if (e.key === "ArrowUp") nr = Math.max(0, r - 1);
					if (e.key === "ArrowDown") nr = Math.min(8, r + 1);
					if (e.key === "ArrowLeft") nc = Math.max(0, c - 1);
					if (e.key === "ArrowRight") nc = Math.min(8, c + 1);
					return [nr, nc];
				});
				return;
			}

			// Number input (1-9)
			if (/^[1-9]$/.test(e.key)) {
				handleInput(parseInt(e.key, 10));
				return;
			}

			// Clear cell (Backspace or Delete)
			if (e.key === "Backspace" || e.key === "Delete") {
				handleInput(null);
				return;
			}

			// Toggle note mode ('n' or 'N')
			if (e.key.toLowerCase() === "n") {
				setIsNoteMode((prev) => !prev);
				return;
			}

			// Undo/Redo (Ctrl+Z / Cmd+Z)
			if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
				e.preventDefault();
				if (e.shiftKey) {
					redo();
				} else {
					undo();
				}
				return;
			}

			// Redo also with Ctrl+Y / Cmd+Y
			if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
				e.preventDefault();
				redo();
				return;
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [showWin, handleInput, undo, redo, setSelectedCell, setIsNoteMode]);
}
