import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export function ProtectedRoute() {
	const { user, loading } = useAuth();
	const location = useLocation();

	if (loading) {
		return (
			<div className="min-h-screen bg-background flex items-center justify-center text-foreground">
				<div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
			</div>
		);
	}

	if (!user) {
		return <Navigate to="/login" state={{ from: location }} replace />;
	}

	return <Outlet />;
}
