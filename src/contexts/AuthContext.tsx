import {
	signOut as firebaseSignOut,
	onAuthStateChanged,
	type User,
} from "firebase/auth";
import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../firebase";

interface AuthContextType {
	user: User | null;
	loading: boolean;
	signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, (u) => {
			setUser(u);
			setLoading(false);
		});
		return unsubscribe;
	}, []);

	const signOut = async () => {
		await firebaseSignOut(auth);
	};

	return (
		<AuthContext.Provider value={{ user, loading, signOut }}>
			{children}
		</AuthContext.Provider>
	);
};

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
};
