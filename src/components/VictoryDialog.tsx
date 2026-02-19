import { Trophy } from "lucide-react";
import type React from "react";
import { formatTime } from "@/lib/utils";
import { DIFFICULTIES } from "../logic/constants";
import { Dialog } from "./Dialog";

interface VictoryDialogProps {
	open: boolean;
	time: number;
	difficulty: string;
	onReview: () => void;
	onHome: () => void;
}

export const VictoryDialog: React.FC<VictoryDialogProps> = ({
	open,
	time,
	difficulty,
	onReview,
	onHome,
}) => {
	return (
		<Dialog open={open} className="text-center">
			<Trophy size={64} className="text-yellow-400 mx-auto mb-4" />
			<h2 className="text-3xl font-bold mb-2">Victory!</h2>
			<div className="flex flex-col gap-1 mb-6">
				<p className="text-text-secondary">Solved in {formatTime(time)}</p>
				<p className="text-yellow-500/80 font-bold uppercase tracking-wider text-sm">
					{DIFFICULTIES.find((d) => d.id === difficulty)?.label || difficulty}{" "}
					Difficulty
				</p>
			</div>
			<div className="flex flex-col gap-3">
				<button
					type="button"
					onClick={onReview}
					className="w-full py-4 bg-surface-hover hover:bg-surface-input rounded-xl font-bold transition-all border border-border-subtle"
				>
					Review Game
				</button>
				<button
					type="button"
					onClick={onHome}
					className="w-full py-4 bg-brand-primary rounded-xl font-bold shadow-lg shadow-brand-primary/40 active:scale-95 transition-all text-white"
				>
					Back to Menu
				</button>
			</div>
		</Dialog>
	);
};
