import { AnimatePresence, motion } from "framer-motion";
import {
	EllipsisVerticalIcon,
	Info,
	Lightbulb,
	RotateCcw,
	Wand2,
	X,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { cn } from "../lib/utils";
import { DIFFICULTIES } from "../logic/constants";
import type { Difficulty } from "../types";
import { Dialog } from "./Dialog";

interface GameMenuProps {
	difficulty: Difficulty;
	score?: number;
	techniques?: string[];
	onHint?: () => void;
	onSolve?: () => void;
	onReset?: () => void;
}

export const GameMenu: React.FC<GameMenuProps> = ({
	difficulty,
	score,
	techniques,
	onHint,
	onSolve,
	onReset,
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const [showAbout, setShowAbout] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const diffLabel =
		DIFFICULTIES.find((d) => d.id === difficulty)?.label || difficulty;

	return (
		<div className="relative" ref={menuRef}>
			<button
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				className={cn(
					"flex items-center gap-2 p-2 text-sm",
					isOpen
						? "text-primary"
						: "hover:bg-accent rounded-xl active:scale-90",
				)}
			>
				<EllipsisVerticalIcon />
			</button>

			<AnimatePresence>
				{isOpen && (
					<motion.div
						initial={{ opacity: 0, y: -10, scale: 0.95 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: -10, scale: 0.95 }}
						transition={{ duration: 0.15 }}
						className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50 flex flex-col p-1"
					>
						<button
							type="button"
							onClick={() => {
								setIsOpen(false);
								setShowAbout(true);
							}}
							className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-accent text-foreground transition-colors text-left"
						>
							<Info size={16} className="text-muted-foreground" />
							<span className="font-medium">About</span>
						</button>
						<button
							type="button"
							disabled={!onHint}
							onClick={() => {
								if (!onHint) return;
								setIsOpen(false);
								onHint();
							}}
							className={cn(
								"flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg text-foreground transition-colors text-left",
								onHint ? "hover:bg-accent" : "opacity-50 cursor-not-allowed",
							)}
						>
							<Lightbulb size={16} className="text-muted-foreground" />
							<span className="font-medium">Hint</span>
						</button>
						<button
							type="button"
							disabled={!onSolve}
							onClick={() => {
								if (!onSolve) return;
								setIsOpen(false);
								onSolve();
							}}
							className={cn(
								"flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg text-foreground transition-colors text-left",
								onSolve ? "hover:bg-accent" : "opacity-50 cursor-not-allowed",
							)}
						>
							<Wand2 size={16} className="text-muted-foreground" />
							<span className="font-medium">Solve</span>
						</button>
						<div className="h-px bg-border my-1 mx-2" />
						<button
							type="button"
							disabled={!onReset}
							onClick={() => {
								if (!onReset) return;
								setIsOpen(false);
								onReset();
							}}
							className={cn(
								"flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors text-left",
								onReset
									? "hover:bg-red-500/10 text-red-500"
									: "text-muted-foreground opacity-50 cursor-not-allowed",
							)}
						>
							<RotateCcw size={16} />
							<span className="font-medium">Reset</span>
						</button>
					</motion.div>
				)}
			</AnimatePresence>

			<Dialog open={showAbout} onClose={() => setShowAbout(false)}>
				<div className="flex items-center justify-between mb-6">
					<h2 className="text-xl font-bold">Puzzle Info</h2>
					<button
						type="button"
						onClick={() => setShowAbout(false)}
						className="p-1 text-muted-foreground hover:text-foreground transition-colors"
					>
						<X size={20} />
					</button>
				</div>

				<div className="flex flex-col gap-3">
					<div className="flex justify-between items-center bg-secondary p-3 rounded-xl border border-border">
						<span className="text-muted-foreground text-sm uppercase tracking-wider font-bold">
							Difficulty
						</span>
						<span className="font-bold text-yellow-500">{diffLabel}</span>
					</div>

					{score != null && (
						<div className="flex justify-between items-center bg-secondary p-3 rounded-xl border border-border">
							<span className="text-muted-foreground text-sm uppercase tracking-wider font-bold">
								Score
							</span>
							<span className="font-mono font-bold text-lg text-primary">
								{score.toFixed(2)}
							</span>
						</div>
					)}

					{techniques && techniques.length > 0 && (
						<div className="flex flex-col gap-2">
							<span className="text-muted-foreground text-sm uppercase tracking-wider font-bold">
								Techniques Required
							</span>
							<div className="flex flex-wrap gap-1.5">
								{techniques.map((t) => (
									<span
										key={t}
										className="px-2.5 py-1 bg-secondary border border-border rounded-lg text-xs font-medium"
									>
										{t}
									</span>
								))}
							</div>
						</div>
					)}

					{!score && (!techniques || techniques.length === 0) && (
						<p className="text-muted-foreground text-sm text-center py-2">
							No additional puzzle information available.
						</p>
					)}
				</div>
			</Dialog>
		</div>
	);
};
