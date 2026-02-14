import { motion } from "framer-motion";
import { Brain, Play, Settings as SettingsIcon, Trophy } from "lucide-react";
import type React from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";

interface HomePageProps {
	hasExistingGame: boolean;
}

export const HomePage: React.FC<HomePageProps> = ({ hasExistingGame }) => {
	const navigate = useNavigate();

	return (
		<Layout>
			<div className="page-container">
				<div className="content-wrapper justify-center flex-1">
					{/* Header */}
					<motion.div
						initial={{ opacity: 0, scale: 0.9 }}
						animate={{ opacity: 1, scale: 1 }}
						className="flex flex-col items-center mb-12"
					>
						<div className="bg-brand-primary/20 w-24 h-24 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-brand-primary/20 border border-brand-primary/30">
							<Brain size={56} className="text-brand-primary" />
						</div>
						<h1 className="text-5xl font-black mb-2 bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-primary bg-[length:200%_auto] bg-clip-text text-transparent animate-gradient tracking-tight">
							Sudoques
						</h1>
						<p className="text-slate-400 font-medium">Elevate your mind.</p>
					</motion.div>

					{/* Actions */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.1 }}
						className="flex flex-col gap-4 w-full"
					>
						{hasExistingGame && (
							<button
								type="button"
								onClick={() => navigate("/game")}
								className="group relative flex items-center justify-center gap-3 py-5 rounded-2xl bg-white text-slate-950 font-bold text-lg shadow-xl active:scale-95 transition-all"
							>
								<Play size={24} fill="currentColor" />
								<span>Continue Game</span>
							</button>
						)}

						<button
							type="button"
							onClick={() => navigate("/new-game")}
							className="group relative flex items-center justify-center gap-3 py-5 rounded-2xl bg-brand-primary text-white font-bold text-lg shadow-xl shadow-brand-primary/30 active:scale-95 transition-all overflow-hidden"
						>
							<div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
							<Play size={24} fill="currentColor" />
							<span>New Game</span>
						</button>

						<div className="grid grid-cols-2 gap-4">
							<button
								type="button"
								onClick={() => navigate("/leaderboard")}
								className="flex items-center justify-center gap-3 py-4 rounded-2xl glass hover:bg-white/10 text-white font-bold active:scale-95 transition-all border border-white/10"
							>
								<Trophy size={20} className="text-yellow-400" />
								<span>Leaderboard</span>
							</button>

							<button
								type="button"
								onClick={() => navigate("/settings")}
								className="flex items-center justify-center gap-3 py-4 rounded-2xl glass hover:bg-white/10 text-white font-bold active:scale-95 transition-all border border-white/10"
							>
								<SettingsIcon size={20} />
								<span>Settings</span>
							</button>
						</div>
					</motion.div>
				</div>
			</div>
		</Layout>
	);
};
