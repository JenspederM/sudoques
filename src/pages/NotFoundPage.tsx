import { Home } from "lucide-react";
import type React from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";

export const NotFoundPage: React.FC = () => {
	const navigate = useNavigate();

	return (
		<Layout>
			<div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
				<h1 className="text-6xl font-black text-brand-primary mb-4">404</h1>
				<p className="text-2xl font-bold text-white mb-2">Page Not Found</p>
				<p className="text-slate-400 mb-8 max-w-md">
					The page you are looking for might have been removed, had its name
					changed, or is temporarily unavailable.
				</p>
				<button
					type="button"
					onClick={() => navigate("/")}
					className="flex items-center gap-2 px-6 py-3 bg-brand-primary rounded-xl text-white font-bold hover:bg-brand-secondary transition-colors shadow-lg shadow-brand-primary/20"
				>
					<Home size={20} />
					<span>Back to Home</span>
				</button>
			</div>
		</Layout>
	);
};
