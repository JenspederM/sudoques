import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeToUser } from "@/logic/firebase";
import { isPuzzleHistoryHydrated } from "@/logic/puzzleSelection";
import type { Accent, Mode } from "@/types";

interface UserContextType {
	accent: Accent;
	mode: Mode;
	playedPuzzles: string[];
	playedPuzzlesReady: boolean;
}

type UserData = Omit<UserContextType, "playedPuzzlesReady">;

type UserSnapshot = {
	userId: string | null;
	data: UserData;
	isLoaded: boolean;
};

const DEFAULT_USER_DATA: UserData = {
	accent: "default",
	mode: "dark",
	playedPuzzles: [],
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const { user } = useAuth();
	const activeUserId = user?.uid ?? null;
	const [snapshot, setSnapshot] = useState<UserSnapshot>({
		userId: null,
		data: DEFAULT_USER_DATA,
		isLoaded: false,
	});

	useEffect(() => {
		if (!activeUserId) {
			setSnapshot({
				userId: null,
				data: DEFAULT_USER_DATA,
				isLoaded: true,
			});
			return;
		}

		let isActive = true;
		setSnapshot({
			userId: activeUserId,
			data: DEFAULT_USER_DATA,
			isLoaded: false,
		});

		const unsubscribe = subscribeToUser(activeUserId, (data) => {
			if (!isActive) return;
			setSnapshot({
				userId: activeUserId,
				data: {
					accent: data.settings?.accent || "default",
					mode: data.settings?.mode || "dark",
					playedPuzzles: data.playedPuzzles || [],
				},
				isLoaded: true,
			});
		});

		return () => {
			isActive = false;
			unsubscribe();
		};
	}, [activeUserId]);

	const snapshotMatchesActiveUser = snapshot.userId === activeUserId;
	const userData = snapshotMatchesActiveUser
		? snapshot.data
		: DEFAULT_USER_DATA;
	const playedPuzzlesReady = isPuzzleHistoryHydrated(
		activeUserId,
		snapshot.userId,
		snapshot.isLoaded,
	);

	return (
		<UserContext.Provider value={{ ...userData, playedPuzzlesReady }}>
			{children}
		</UserContext.Provider>
	);
};

export const useUser = () => {
	const context = useContext(UserContext);
	if (context === undefined) {
		throw new Error("useUser must be used within a UserProvider");
	}
	return context;
};
