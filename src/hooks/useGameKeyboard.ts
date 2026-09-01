import { useEffect } from "react";

interface UseGameKeyboardProps {
	showWin: boolean;
	setSelectedCell: React.Dispatch<
		React.SetStateAction<[number, number] | null>
	>;
	handleInput: (num: number | null) => void;
	handleQuickNote: (num: number) => void;
	onToggleNoteMode: () => void;
	undo: () => void;
	redo: () => void;
}

export function getNumberKeyInput(
	event: Pick<KeyboardEvent, "key" | "code" | "shiftKey">,
) {
	const keyDigit = /^[1-9]$/.test(event.key) ? event.key : null;
	const shiftedCodeDigit = event.shiftKey
		? /^Digit([1-9])$/.exec(event.code)?.[1]
		: null;
	const digit = keyDigit ?? shiftedCodeDigit;

	return digit ? { value: Number(digit), asNote: event.shiftKey } : null;
}

export function useGameKeyboard({
	showWin,
	setSelectedCell,
	handleInput,
	handleQuickNote,
	onToggleNoteMode,
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

			// Number input (1-9). Shift changes e.key to punctuation on many layouts,
			// so use the physical Digit key as a fallback for quick notes.
			const numberInput = getNumberKeyInput(e);
			if (numberInput) {
				if (numberInput.asNote) handleQuickNote(numberInput.value);
				else handleInput(numberInput.value);
				return;
			}

			// Clear cell (Backspace or Delete)
			if (e.key === "Backspace" || e.key === "Delete") {
				handleInput(null);
				return;
			}

			// Toggle note mode ('n' or 'N')
			if (e.key.toLowerCase() === "n") {
				onToggleNoteMode();
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
	}, [
		showWin,
		handleInput,
		handleQuickNote,
		undo,
		redo,
		setSelectedCell,
		onToggleNoteMode,
	]);
}
