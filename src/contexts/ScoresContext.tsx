import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeToUserScores } from "@/logic/firebase";
import type { HighScore } from "@/types";

interface ScoresContextType {
	scores: HighScore[];
}

const ScoresContext = createContext<ScoresContextType | undefined>(undefined);

export const ScoresProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const { user } = useAuth();
	const [scores, setScores] = useState<HighScore[]>([]);

	useEffect(() => {
		if (!user) return;

		const unsubscribe = subscribeToUserScores(user.uid, (newScores) => {
			setScores(newScores);
		});

		return unsubscribe;
	}, [user]);

	return (
		<ScoresContext.Provider value={{ scores }}>
			{children}
		</ScoresContext.Provider>
	);
};

export const useScores = () => {
	const context = useContext(ScoresContext);
	if (context === undefined) {
		throw new Error("useScores must be used within a ScoresProvider");
	}
	return context;
};
