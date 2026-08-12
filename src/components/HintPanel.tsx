import { m } from "framer-motion";
import {
	AlertTriangle,
	ChevronLeft,
	ChevronRight,
	Lightbulb,
	X,
} from "lucide-react";
import type { ExplainableHint } from "@/logic/explainableSolver";

type HintPanelProps = {
	hint: ExplainableHint;
	stepIndex: number;
	onStepChange: (index: number) => void;
	onClose: () => void;
};

export function HintPanel({
	hint,
	stepIndex,
	onStepChange,
	onClose,
}: HintPanelProps) {
	const step = hint.steps[stepIndex];
	const hasPrevious = stepIndex > 0;
	const hasNext = stepIndex < hint.steps.length - 1;

	return (
		<m.aside
			initial={{ opacity: 0, y: 24 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: 24 }}
			aria-live="polite"
			data-testid="hint-panel"
			className="fixed z-[90] bottom-[max(1rem,var(--safe-bottom))] left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-xl rounded-2xl border border-primary/30 bg-card/95 shadow-2xl shadow-black/30 backdrop-blur-xl p-4 sm:p-5 xl:left-[calc(50%+18rem)] xl:w-80 xl:translate-x-0"
		>
			<div className="flex items-start gap-3">
				<div className="mt-0.5 rounded-xl bg-primary/15 p-2 text-primary">
					{hint.status === "invalid" ? (
						<AlertTriangle size={20} />
					) : (
						<Lightbulb size={20} />
					)}
				</div>

				<div className="min-w-0 flex-1">
					<div className="flex items-start justify-between gap-3">
						<div>
							{step && (
								<p className="text-xs font-bold uppercase tracking-widest text-primary">
									{step.technique}
								</p>
							)}
							<h2 className="mt-0.5 text-lg font-bold text-foreground">
								{step?.title ?? "Hint"}
							</h2>
						</div>
						<button
							type="button"
							onClick={onClose}
							aria-label="Close hint"
							data-testid="close-hint"
							className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
						>
							<X size={18} />
						</button>
					</div>

					<p className="mt-2 text-sm leading-relaxed text-foreground">
						{step?.summary ?? hint.message}
					</p>

					{step && step.details.length > 0 && (
						<ol className="mt-3 space-y-1.5 text-sm text-muted-foreground">
							{step.details.map((detail, index) => (
								<li key={detail} className="flex gap-2">
									<span className="font-mono font-bold text-primary">
										{index + 1}.
									</span>
									<span>{detail}</span>
								</li>
							))}
						</ol>
					)}

					{step && (
						<div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-muted-foreground">
							{step.pattern.length > 0 && (
								<span className="flex items-center gap-1.5">
									<span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
									Pattern
								</span>
							)}
							{step.eliminations.length > 0 && (
								<span className="flex items-center gap-1.5">
									<span className="h-2.5 w-2.5 rounded-full bg-red-500" />
									Eliminate
								</span>
							)}
							{step.placement && (
								<span className="flex items-center gap-1.5">
									<span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
									Place
								</span>
							)}
						</div>
					)}

					{hint.steps.length > 1 && (
						<div className="mt-4 flex items-center justify-between border-t border-border pt-3">
							<button
								type="button"
								disabled={!hasPrevious}
								onClick={() => onStepChange(stepIndex - 1)}
								data-testid="previous-hint-step"
								className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30"
							>
								<ChevronLeft size={16} /> Previous
							</button>
							<span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
								Step {stepIndex + 1} of {hint.steps.length}
							</span>
							<button
								type="button"
								disabled={!hasNext}
								onClick={() => onStepChange(stepIndex + 1)}
								data-testid="next-hint-step"
								className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-semibold text-primary hover:bg-primary/10 disabled:opacity-30"
							>
								Next <ChevronRight size={16} />
							</button>
						</div>
					)}
				</div>
			</div>
		</m.aside>
	);
}
