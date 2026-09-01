import type React from "react";
import { StaggeredListElement } from "@/components/StaggeredList";

interface HapticFeedbackSettingProps {
	enabled: boolean;
	onToggle: () => void;
}

export const HapticFeedbackSetting: React.FC<HapticFeedbackSettingProps> = ({
	enabled,
	onToggle,
}) => (
	<StaggeredListElement
		type="card"
		className="shrink-0 overflow-hidden p-0"
		data-testid="haptic-feedback-setting"
	>
		<button
			type="button"
			role="switch"
			aria-checked={enabled}
			onClick={onToggle}
			className="flex min-h-20 w-full items-center gap-4 px-6 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
		>
			<div className="min-w-0 flex-1">
				<p className="font-bold text-foreground">Haptic feedback</p>
				<p className="text-sm text-muted-foreground">
					Subtle taps for game actions, warnings and wins
				</p>
			</div>
			<span
				aria-hidden="true"
				className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
					enabled ? "bg-primary" : "bg-secondary"
				}`}
			>
				<span
					className={`absolute top-1 size-5 rounded-full bg-white shadow-sm transition-transform ${
						enabled ? "translate-x-6" : "translate-x-1"
					}`}
				/>
			</span>
		</button>
	</StaggeredListElement>
);
