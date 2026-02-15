import { Delete } from "lucide-react";
import type React from "react";
import { cn } from "../lib/utils";

interface NumpadProps {
	onNumberClick: (num: number | null) => void;
	disabledNumbers?: number[];
}

export const Numpad: React.FC<NumpadProps> = ({
	onNumberClick,
	disabledNumbers = [],
}) => {
	const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];

	return (
		<div className="grid grid-cols-5 gap-1.5 sm:gap-2 w-full shrink-0">
			{/* 1 2 3 4 5 */}
			{numbers.slice(0, 5).map((num) => (
				<button
					type="button"
					key={num}
					data-testid={`numpad-${num}`}
					onClick={() => onNumberClick(num)}
					disabled={disabledNumbers.includes(num)}
					className={cn(
						"aspect-square flex items-center justify-center text-xl sm:text-2xl font-semibold rounded-xl glass transition-all active:scale-95",
						"hover:bg-brand-primary/20 hover:border-brand-primary/50 text-white",
						disabledNumbers.includes(num) && "opacity-30 cursor-not-allowed",
					)}
				>
					{num}
				</button>
			))}

			{/* 6 7 8 9 x */}
			{numbers.slice(5).map((num) => (
				<button
					type="button"
					key={num}
					data-testid={`numpad-${num}`}
					onClick={() => onNumberClick(num)}
					disabled={disabledNumbers.includes(num)}
					className={cn(
						"aspect-square flex items-center justify-center text-xl sm:text-2xl font-semibold rounded-xl glass transition-all active:scale-95",
						"hover:bg-brand-primary/20 hover:border-brand-primary/50 text-white",
						disabledNumbers.includes(num) && "opacity-30 cursor-not-allowed",
					)}
				>
					{num}
				</button>
			))}
			<button
				type="button"
				data-testid="numpad-delete"
				onClick={() => onNumberClick(null)}
				className="aspect-square flex items-center justify-center text-xl sm:text-2xl font-semibold rounded-xl glass transition-all active:scale-95 bg-red-500/10 hover:bg-red-500/20 hover:border-red-500/50 text-red-400"
			>
				<Delete size={24} />
			</button>
		</div>
	);
};
