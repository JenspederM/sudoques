import type { ReactNode } from "react";
import { Spinner } from "@/components/Spinner";
import type { InitialGameResumeDecision } from "@/logic/initialGameResume";

interface InitialGameResumeGateProps {
	decision: InitialGameResumeDecision;
	showProvisionalHome?: boolean;
	children: ReactNode;
}

/**
 * Keeps Home hidden during ordinary hydration. A cache-confirmed miss can show
 * Home provisionally while the server lookup remains armed in the background.
 */
export function InitialGameResumeGate({
	decision,
	showProvisionalHome = false,
	children,
}: InitialGameResumeGateProps) {
	if (decision !== "stay" && !(decision === "wait" && showProvisionalHome)) {
		return <Spinner />;
	}

	return children;
}
