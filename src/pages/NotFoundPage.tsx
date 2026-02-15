import type React from "react";
import { Layout } from "../components/Layout";

export const NotFoundPage: React.FC = () => {
	return (
		<Layout backRedirect="/" headerChildren={<span>Back to home</span>}>
			<div className="text-center">
				<h1 className="text-6xl font-black text-brand-primary mb-4">404</h1>
				<p className="text-2xl font-bold text-white mb-2">Page Not Found</p>
				<p className="text-slate-400 mb-8 max-w-md">
					The page you are looking for might have been removed, had its name
					changed, or is temporarily unavailable.
				</p>
			</div>
		</Layout>
	);
};
