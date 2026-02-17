import { Info, X } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { DIFFICULTIES } from "../logic/constants";
import type { Difficulty } from "../types";
import { Dialog } from "./Dialog";

interface PuzzleInfoDialogProps {
	difficulty: Difficulty;
	score?: number;
	techniques?: string[];
}

export const PuzzleInfoDialog: React.FC<PuzzleInfoDialogProps> = ({
	difficulty,
	score,
	techniques,
}) => {
	const [isOpen, setIsOpen] = useState(false);

	const diffLabel =
		DIFFICULTIES.find((d) => d.id === difficulty)?.label || difficulty;

	return (
		<>
			<button
				type="button"
				onClick={() => setIsOpen(true)}
				className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-brand-primary hover:bg-white/10 transition-all text-sm group"
			>
				<Info size={20} />
				<span className="font-bold">{diffLabel}</span>
			</button>
			<Dialog open={isOpen} onClose={() => setIsOpen(false)}>
				<div className="flex items-center justify-between mb-6">
					<h2 className="text-xl font-bold">Puzzle Info</h2>
					<button
						type="button"
						onClick={() => setIsOpen(false)}
						className="p-1 text-slate-400 hover:text-white transition-colors"
					>
						<X size={20} />
					</button>
				</div>

				<div className="flex flex-col gap-3">
					<div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
						<span className="text-slate-400 text-sm uppercase tracking-wider font-bold">
							Difficulty
						</span>
						<span className="font-bold text-yellow-500">{diffLabel}</span>
					</div>

					{score != null && (
						<div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
							<span className="text-slate-400 text-sm uppercase tracking-wider font-bold">
								Score
							</span>
							<span className="font-mono font-bold text-lg text-brand-primary">
								{score.toFixed(2)}
							</span>
						</div>
					)}

					{techniques && techniques.length > 0 && (
						<div className="flex flex-col gap-2">
							<span className="text-slate-400 text-sm uppercase tracking-wider font-bold">
								Techniques Required
							</span>
							<div className="flex flex-wrap gap-1.5">
								{techniques.map((t) => (
									<span
										key={t}
										className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-xs font-medium"
									>
										{t}
									</span>
								))}
							</div>
						</div>
					)}

					{!score && (!techniques || techniques.length === 0) && (
						<p className="text-slate-500 text-sm text-center py-2">
							No additional puzzle information available.
						</p>
					)}
				</div>
			</Dialog>
		</>
	);
};
