import type React from "react";
import type { LogicalTechniqueAnalysis, Technique } from "@/types";

interface GradingTechniquesSummaryProps {
	analysis: LogicalTechniqueAnalysis | null;
	legacyTechniques?: readonly string[];
	isAnalyzing?: boolean;
}

function TechniqueChips({ techniques }: { techniques: readonly string[] }) {
	return (
		<div className="flex flex-wrap gap-1.5">
			{techniques.map((technique) => (
				<span
					key={technique}
					className="px-2.5 py-1 bg-secondary border border-border rounded-lg text-xs font-medium"
				>
					{technique}
				</span>
			))}
		</div>
	);
}

function LegacySummary({ techniques }: { techniques: readonly string[] }) {
	if (techniques.length === 0) return null;
	const usedBacktracking = techniques.includes("Backtracking");
	const observedLogicalTechniques = techniques.filter(
		(technique) => technique !== "Backtracking",
	);

	return (
		<section className="flex flex-col gap-2" aria-labelledby="legacy-heading">
			<div>
				<h3
					id="legacy-heading"
					className="text-muted-foreground text-sm uppercase tracking-wider font-bold"
				>
					Stored grader route
				</h3>
				<p className="mt-1 text-xs leading-relaxed text-muted-foreground">
					This older puzzle only stores one route from the grader. It is not a
					list of techniques every solve requires; regenerate the puzzle data to
					store the current bounded analysis.
				</p>
			</div>
			{observedLogicalTechniques.length > 0 && (
				<TechniqueChips techniques={observedLogicalTechniques} />
			)}
			{usedBacktracking && (
				<div
					className="rounded-lg border border-border bg-secondary px-2.5 py-2"
					data-testid="grading-search"
				>
					<span className="text-xs font-bold text-foreground">
						Guessing/search used
					</span>
					<p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
						Backtracking is search, not a logical Sudoku technique.
					</p>
				</div>
			)}
		</section>
	);
}

function routeTitle(frontier: readonly Technique[], index: number) {
	if (frontier.length === 0) return `Route ${index + 1}`;
	return frontier.join(" + ");
}

export const GradingTechniquesSummary: React.FC<
	GradingTechniquesSummaryProps
> = ({ analysis, legacyTechniques = [], isAnalyzing = false }) => {
	if (isAnalyzing) {
		return (
			<section
				className="rounded-xl border border-border bg-secondary p-3"
				aria-live="polite"
			>
				<h3 className="text-sm font-bold text-foreground">
					Checking alternative logical routes…
				</h3>
				<p className="mt-1 text-xs leading-relaxed text-muted-foreground">
					This puzzle has older metadata, so its bounded analysis is being
					recomputed on this device.
				</p>
			</section>
		);
	}

	if (!analysis) return <LegacySummary techniques={legacyTechniques} />;

	return (
		<section
			className="flex flex-col gap-3"
			aria-labelledby="grading-techniques-heading"
		>
			<div>
				<h3
					id="grading-techniques-heading"
					className="text-muted-foreground text-sm uppercase tracking-wider font-bold"
				>
					Bounded logical analysis
				</h3>
				<p className="mt-1 text-xs leading-relaxed text-muted-foreground">
					This finds the lowest level supported by our grader without guessing.
					At that level it exhaustively tests combinations of the frontier
					techniques while keeping simpler techniques available. It does not
					claim to cover every possible human solve.
				</p>
			</div>

			{analysis.status === "search-needed" ? (
				<div
					className="rounded-lg border border-border bg-secondary px-2.5 py-2"
					data-testid="grading-search"
				>
					<span className="text-xs font-bold text-foreground">
						Search still needed
					</span>
					<p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
						The implemented logical techniques could not finish this puzzle. The
						ordinary grader had to use backtracking.
					</p>
				</div>
			) : (
				<>
					<div className="rounded-xl border border-border bg-secondary p-3">
						<div className="flex items-center justify-between gap-3">
							<span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
								Lowest supported ceiling
							</span>
							<span className="font-mono text-sm font-bold text-primary">
								{analysis.minimumCeiling}
							</span>
						</div>
						<p className="mt-1 text-xs leading-relaxed text-muted-foreground">
							This is the grader's base technique score, not the puzzle's total
							difficulty score.
						</p>
					</div>

					<div className="flex flex-col gap-2" data-testid="logical-routes">
						<span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
							{analysis.routes.length > 1
								? "Alternative routes found at this level"
								: "Route found at this level"}
						</span>
						{analysis.routes.map((route, index) => (
							<div
								key={`${route.frontier.join("|")}:${route.techniques.join("|")}`}
								className="rounded-lg border border-border/80 p-2.5"
							>
								<span className="mb-2 block text-xs font-semibold text-foreground">
									{routeTitle(route.frontier, index)} route
								</span>
								<TechniqueChips techniques={route.techniques} />
							</div>
						))}
					</div>

					<div className="text-xs leading-relaxed text-muted-foreground">
						{analysis.unavoidableInReruns.length > 0 ? (
							<>
								<span className="mb-1.5 block font-semibold text-foreground">
									Could not be avoided in one-at-a-time reruns
								</span>
								<TechniqueChips techniques={analysis.unavoidableInReruns} />
							</>
						) : (
							"No single technique was unavoidable in the bounded reruns; the grader found alternatives."
						)}
					</div>
				</>
			)}

			<p className="text-[11px] leading-relaxed text-muted-foreground/80">
				Analysis {analysis.version}. Existing puzzle records without this
				version are recomputed on this device and should be regenerated before
				the result is treated as stored metadata.
			</p>
		</section>
	);
};
