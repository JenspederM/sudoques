import type React from "react";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
	type AccountScoresState,
	resolveScoresForUser,
	settleScoresForUser,
} from "@/lib/scoresState";
import { subscribeToUserScores } from "@/logic/firebase";
import type { HighScore } from "@/types";

interface ScoresContextType {
	scores: HighScore[];
	isLoading: boolean;
	isUnavailable: boolean;
}

const ScoresContext = createContext<ScoresContextType | undefined>(undefined);
const SCORES_LOAD_TIMEOUT_MS = 5000;

export const ScoresProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const { user } = useAuth();
	const activeUserId = user?.uid ?? null;
	const [snapshot, setSnapshot] = useState<AccountScoresState<HighScore>>({
		userId: null,
		scores: [],
		isLoading: false,
		isUnavailable: false,
	});
	const activeUserIdRef = useRef(activeUserId);
	activeUserIdRef.current = activeUserId;

	useEffect(() => {
		if (!activeUserId) {
			setSnapshot({
				userId: null,
				scores: [],
				isLoading: false,
				isUnavailable: false,
			});
			return;
		}

		let isActive = true;
		let unsubscribe: (() => void) | undefined;
		let loadingTimeout: ReturnType<typeof setTimeout> | undefined;
		setSnapshot({
			userId: activeUserId,
			scores: [],
			isLoading: true,
			isUnavailable: false,
		});

		const failCurrentSubscription = (error: unknown) => {
			if (!isActive) return;
			if (loadingTimeout !== undefined) clearTimeout(loadingTimeout);
			console.error("Failed to subscribe to user scores", error);
			setSnapshot((current) =>
				settleScoresForUser(current, activeUserIdRef.current, activeUserId, {
					type: "failed",
				}),
			);
		};
		loadingTimeout = setTimeout(
			() =>
				failCurrentSubscription(
					new Error("Timed out while waiting for the first score snapshot"),
				),
			SCORES_LOAD_TIMEOUT_MS,
		);

		try {
			unsubscribe = subscribeToUserScores(
				activeUserId,
				(scores) => {
					if (!isActive) return;
					if (loadingTimeout !== undefined) clearTimeout(loadingTimeout);
					setSnapshot((current) =>
						settleScoresForUser(
							current,
							activeUserIdRef.current,
							activeUserId,
							{ type: "loaded", scores },
						),
					);
				},
				failCurrentSubscription,
			);
		} catch (error) {
			failCurrentSubscription(error);
		}

		return () => {
			isActive = false;
			if (loadingTimeout !== undefined) clearTimeout(loadingTimeout);
			unsubscribe?.();
		};
	}, [activeUserId]);

	const value = resolveScoresForUser(snapshot, activeUserId);

	return (
		<ScoresContext.Provider value={value}>{children}</ScoresContext.Provider>
	);
};

export const useScores = () => {
	const context = useContext(ScoresContext);
	if (context === undefined) {
		throw new Error("useScores must be used within a ScoresProvider");
	}
	return context;
};
