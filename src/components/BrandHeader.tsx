import { Brain } from "lucide-react";
import type React from "react";

interface BrandHeaderProps {
	subtitle?: string;
}

export const BrandHeader: React.FC<BrandHeaderProps> = ({ subtitle }) => {
	return (
		<>
			<div className="bg-brand-primary/20 w-24 h-24 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-brand-primary/20 border border-brand-primary/30">
				<Brain size={56} className="text-brand-primary" />
			</div>
			<span className="text-5xl font-black mb-2 bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-primary bg-[length:200%_auto] bg-clip-text text-transparent animate-gradient tracking-tight">
				Sudoques
			</span>
			{subtitle && <p className="text-slate-400 font-medium">{subtitle}</p>}
		</>
	);
};
