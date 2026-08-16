import { m, useReducedMotionConfig } from "framer-motion";
import {
	AlertTriangle,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	ChevronUp,
	CircleHelp,
	Lightbulb,
	MapPin,
	X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { getMotionExit, getMotionInitial } from "@/lib/motion";
import type { ExplainableHint } from "@/logic/explainableSolver";
import {
	getTechniqueExplanation,
	type HintDisclosureStage,
	nextHintDisclosureStage,
	previousHintDisclosureStage,
} from "@/logic/hintPresentation";

type HintPanelProps = {
	hint: ExplainableHint;
	stepIndex: number;
	disclosureStage: HintDisclosureStage;
	onDisclosureStageChange: (stage: HintDisclosureStage) => void;
	onStepChange: (index: number) => void;
	onClose: () => void;
};

export function HintPanel({
	hint,
	stepIndex,
	disclosureStage,
	onDisclosureStageChange,
	onStepChange,
	onClose,
}: HintPanelProps) {
	const [isCollapsed, setIsCollapsed] = useState(false);
	const [showTechniqueHelp, setShowTechniqueHelp] = useState(false);
	const step = hint.steps[stepIndex];
	const hasPrevious = stepIndex > 0;
	const hasNext = stepIndex < hint.steps.length - 1;
	const shouldReduceMotion = useReducedMotionConfig();
	const isCorrection = hint.status === "invalid" || step?.kind === "correction";
	const visibleDisclosureStage = isCorrection ? "details" : disclosureStage;

	useEffect(() => {
		if (stepIndex >= 0 && hint.status) {
			setIsCollapsed(false);
			setShowTechniqueHelp(false);
		}
	}, [hint, stepIndex]);

	if (isCollapsed) {
		return (
			<m.aside
				layout={!shouldReduceMotion}
				initial={getMotionInitial(shouldReduceMotion, {
					opacity: 0,
					y: 16,
				})}
				animate={{ opacity: 1, y: 0 }}
				exit={getMotionExit(shouldReduceMotion, { opacity: 0, y: 16 })}
				aria-label="Collapsed hint"
				data-testid="hint-panel"
				data-collapsed="true"
				className="fixed bottom-[max(0.75rem,var(--safe-bottom))] left-[max(0.75rem,var(--safe-left))] right-[max(0.75rem,var(--safe-right))] z-[90] flex min-h-12 items-center gap-2 rounded-2xl border border-primary/30 bg-card/95 px-3 py-2 shadow-2xl shadow-black/30 backdrop-blur-xl sm:left-1/2 sm:right-auto sm:w-[calc(100%-2rem)] sm:max-w-xl sm:-translate-x-1/2 xl:left-[calc(50%+18rem)] xl:w-80 xl:translate-x-0"
			>
				<Lightbulb className="shrink-0 text-primary" size={18} />
				<p className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
					{step?.technique ?? "Hint"}
				</p>
				<button
					type="button"
					onClick={() => setIsCollapsed(false)}
					aria-label="Expand hint"
					data-testid="expand-hint"
					className="flex min-h-10 items-center gap-1 rounded-xl px-3 text-sm font-semibold text-primary hover:bg-primary/10"
				>
					Show <ChevronUp size={16} />
				</button>
				<button
					type="button"
					onClick={onClose}
					aria-label="Close hint"
					data-testid="close-hint"
					className="flex size-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground"
				>
					<X size={18} />
				</button>
			</m.aside>
		);
	}

	const techniqueExplanation = step
		? getTechniqueExplanation(step.technique)
		: null;
	const isTechniqueStage = visibleDisclosureStage === "technique";
	const isLocationStage = visibleDisclosureStage === "location";
	const isDetailsStage = visibleDisclosureStage === "details";

	return (
		<m.aside
			layout={!shouldReduceMotion}
			initial={getMotionInitial(shouldReduceMotion, { opacity: 0, y: 24 })}
			animate={{ opacity: 1, y: 0 }}
			exit={getMotionExit(shouldReduceMotion, { opacity: 0, y: 24 })}
			aria-label="Sudoku hint"
			aria-live="polite"
			data-testid="hint-panel"
			data-collapsed="false"
			data-disclosure-stage={visibleDisclosureStage}
			className="fixed bottom-[max(0.75rem,var(--safe-bottom))] left-[max(0.75rem,var(--safe-left))] right-[max(0.75rem,var(--safe-right))] z-[90] flex max-h-[min(70dvh,36rem)] flex-col overflow-hidden rounded-2xl border border-primary/30 bg-card/95 shadow-2xl shadow-black/30 backdrop-blur-xl sm:left-1/2 sm:right-auto sm:w-[calc(100%-2rem)] sm:max-w-xl sm:-translate-x-1/2 xl:left-[calc(50%+18rem)] xl:w-80 xl:translate-x-0"
		>
			<div className="flex shrink-0 items-start gap-3 border-b border-border/70 px-3 py-3 sm:px-4">
				<div className="mt-0.5 rounded-xl bg-primary/15 p-2 text-primary">
					{hint.status === "invalid" ? (
						<AlertTriangle size={20} />
					) : (
						<Lightbulb size={20} />
					)}
				</div>
				<div className="min-w-0 flex-1">
					<p className="text-xs font-bold uppercase tracking-widest text-primary">
						{step
							? isTechniqueStage
								? "Next technique"
								: step.technique
							: "Hint"}
					</p>
					<h2
						className="mt-0.5 text-lg font-bold leading-tight text-foreground"
						data-testid="hint-heading"
					>
						{step
							? isTechniqueStage
								? step.technique
								: isLocationStage
									? "Where to look"
									: step.title
							: "No next step found"}
					</h2>
				</div>
				<div className="flex shrink-0 items-center gap-1">
					<button
						type="button"
						onClick={() => setIsCollapsed(true)}
						aria-label="Collapse hint"
						data-testid="collapse-hint"
						className="flex size-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground"
					>
						<ChevronDown size={18} />
					</button>
					<button
						type="button"
						onClick={onClose}
						aria-label="Close hint"
						data-testid="close-hint"
						className="flex size-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground"
					>
						<X size={18} />
					</button>
				</div>
			</div>

			<div className="min-h-0 overflow-y-auto overscroll-contain px-4 pb-4 pt-3 sm:px-5">
				{!step && (
					<p className="text-sm leading-relaxed text-foreground">
						{hint.message}
					</p>
				)}

				{step && isTechniqueStage && (
					<p className="text-sm leading-relaxed text-muted-foreground">
						Try to find the next move using this technique. No cells or
						candidates have been revealed yet.
					</p>
				)}

				{step && isLocationStage && (
					<p className="text-sm leading-relaxed text-foreground">
						Focus on the highlighted part of the board and look for a{" "}
						<span className="font-semibold">{step.technique}</span>. The exact
						candidates are still hidden.
					</p>
				)}

				{step && isDetailsStage && (
					<>
						<p className="text-sm leading-relaxed text-foreground">
							{step.summary}
						</p>

						{step.details.length > 0 && (
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
					</>
				)}

				{step && techniqueExplanation && !isCorrection && (
					<div className="mt-3 rounded-xl border border-border bg-secondary/60">
						<button
							type="button"
							onClick={() => setShowTechniqueHelp((visible) => !visible)}
							aria-expanded={showTechniqueHelp}
							data-testid="toggle-technique-explanation"
							className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-left text-sm font-semibold text-foreground hover:bg-accent"
						>
							<CircleHelp size={17} className="shrink-0 text-primary" />
							<span className="flex-1">How does {step.technique} work?</span>
							{showTechniqueHelp ? (
								<ChevronUp size={16} />
							) : (
								<ChevronDown size={16} />
							)}
						</button>
						{showTechniqueHelp && (
							<p
								className="border-t border-border px-3 py-2.5 text-sm leading-relaxed text-muted-foreground"
								data-testid="technique-explanation"
							>
								{techniqueExplanation}
							</p>
						)}
					</div>
				)}

				{step && !isCorrection && (
					<div className="mt-4 flex items-center gap-2">
						{!isTechniqueStage && (
							<button
								type="button"
								onClick={() =>
									onDisclosureStageChange(
										previousHintDisclosureStage(disclosureStage),
									)
								}
								data-testid="less-hint-detail"
								className="min-h-11 rounded-xl border border-border px-3 text-sm font-semibold text-muted-foreground hover:bg-accent hover:text-foreground"
							>
								Back
							</button>
						)}
						{!isDetailsStage && (
							<button
								type="button"
								onClick={() =>
									onDisclosureStageChange(
										nextHintDisclosureStage(disclosureStage),
									)
								}
								data-testid={
									isTechniqueStage ? "show-hint-location" : "show-full-hint"
								}
								className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:brightness-110"
							>
								{isTechniqueStage ? (
									<>
										<MapPin size={17} /> Show where to look
									</>
								) : (
									<>
										<Lightbulb size={17} /> Reveal full hint
									</>
								)}
							</button>
						)}
					</div>
				)}

				{step && isDetailsStage && hint.steps.length > 1 && (
					<div className="mt-4 flex items-center justify-between border-t border-border pt-3">
						<button
							type="button"
							disabled={!hasPrevious}
							onClick={() => onStepChange(stepIndex - 1)}
							data-testid="previous-hint-step"
							className="flex min-h-10 items-center gap-1 rounded-lg px-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30"
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
							className="flex min-h-10 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-primary hover:bg-primary/10 disabled:opacity-30"
						>
							Next <ChevronRight size={16} />
						</button>
					</div>
				)}
			</div>
		</m.aside>
	);
}
