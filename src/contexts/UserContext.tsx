import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeToUser } from "@/logic/firebase";
import type { Accent, Mode } from "@/types";

interface UserContextType {
	accent: Accent;
	mode: Mode;
	playedPuzzles: string[];
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const { user } = useAuth();
	const [userData, setUserData] = useState<UserContextType>({
		accent: "default",
		mode: "dark",
		playedPuzzles: [],
	});

	useEffect(() => {
		if (!user) return;

		const unsubscribe = subscribeToUser(user.uid, (data) => {
			setUserData({
				accent: data.settings?.accent || "default",
				mode: data.settings?.mode || "dark",
				playedPuzzles: data.playedPuzzles || [],
			});
		});

		return unsubscribe;
	}, [user]);

	return (
		<UserContext.Provider value={userData}>{children}</UserContext.Provider>
	);
};

export const useUser = () => {
	const context = useContext(UserContext);
	if (context === undefined) {
		throw new Error("useUser must be used within a UserProvider");
	}
	return context;
};
