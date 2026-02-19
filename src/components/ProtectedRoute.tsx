import type React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const { user, loading } = useAuth();
	const location = useLocation();

	if (loading) {
		return (
			<div className="min-h-screen bg-surface-main flex items-center justify-center text-text-primary">
				<div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
			</div>
		);
	}

	if (!user) {
		return <Navigate to="/login" state={{ from: location }} replace />;
	}

	return <>{children}</>;
};
