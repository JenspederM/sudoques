import { Brain } from "lucide-react";
import type React from "react";

interface BrandHeaderProps {
	subtitle?: string;
}

export const BrandHeader: React.FC<BrandHeaderProps> = ({ subtitle }) => {
	return (
		<>
			<div className="bg-primary/20 w-24 h-24 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-primary/20 border border-primary/30">
				<Brain size={56} className="text-primary" />
			</div>
			<span className="text-5xl font-black mb-2 bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent animate-gradient tracking-tight">
				Sudoques
			</span>
			{subtitle && (
				<p className="text-muted-foreground font-medium">{subtitle}</p>
			)}
		</>
	);
};
