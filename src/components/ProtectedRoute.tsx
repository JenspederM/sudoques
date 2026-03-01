import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Spinner } from "@/components/Spinner";
import { useAuth } from "@/contexts/AuthContext";

export function ProtectedRoute() {
	const { user, loading } = useAuth();
	const location = useLocation();

	if (loading) {
		return <Spinner />;
	}

	if (!user) {
		return <Navigate to="/login" state={{ from: location }} replace />;
	}

	return <Outlet />;
}
