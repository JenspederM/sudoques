import { motion } from "framer-motion";
import { Play } from "lucide-react";
import type React from "react";
import { Layout } from "../components/Layout";
import { DIFFICULTIES } from "../logic/constants";
import type { Difficulty } from "../types";

interface NewGamePageProps {
	onSelectDifficulty: (difficulty: Difficulty) => void;
}

export const NewGamePage: React.FC<NewGamePageProps> = ({
	onSelectDifficulty,
}) => {
	return (
		<Layout
			backRedirect="/"
			headerChildren={
				<h2 className="text-2xl font-black tracking-tight">New Game</h2>
			}
		>
			<div className="w-full space-y-4">
				{DIFFICULTIES.map((d, i) => (
					<motion.button
						key={d.id}
						initial={{ opacity: 0, x: -20 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ delay: i * 0.1 }}
						type="button"
						onClick={() => onSelectDifficulty(d.id)}
						className="w-full group relative flex items-center justify-between p-6 rounded-xl glass hover:bg-brand-primary/10 border border-white/10 hover:border-brand-primary/30 active:scale-[0.98] transition-all text-left overflow-hidden"
					>
						{/* Decorative background element */}
						<div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-brand-primary/10 transition-colors" />

						<div className="relative z-10">
							<h3 className="text-2xl font-black mb-1 group-hover:text-brand-primary transition-colors">
								{d.label}
							</h3>
							<p className="text-slate-400 text-sm font-medium">{d.desc}</p>
						</div>

						<div className="relative z-10 w-12 h-12 rounded-2xl bg-white/5 group-hover:bg-brand-primary group-hover:text-white flex items-center justify-center transition-all shadow-lg">
							<Play size={20} fill="currentColor" />
						</div>
					</motion.button>
				))}
			</div>
		</Layout>
	);
};
