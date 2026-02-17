import { TimerIcon } from "lucide-react";
import { formatTime } from "@/lib/utils";

type TimerProps = {
	time: number;
};

export function Timer({ time }: TimerProps) {
	return (
		<div className="flex items-center gap-1.5 sm:gap-2 text-brand-primary -ml-4">
			<TimerIcon size={20} />
			<span
				data-testid="timer"
				className="font-mono text-lg sm:text-xl -mb-1.5"
			>
				{formatTime(time)}
			</span>
		</div>
	);
}
