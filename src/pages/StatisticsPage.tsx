import { motion } from "framer-motion";
import { ChevronLeft, Timer, Trophy } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { getUserScores, type HighScore } from "../logic/firebase";
import { useAuth } from "../components/AuthProvider";

import { DIFFICULTIES } from "../logic/constants";

export const StatisticsPage: React.FC = () => {
	const navigate = useNavigate();
	const [activeDiff, setActiveDiff] = useState("45");
	const [scores, setScores] = useState<HighScore[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	const { user } = useAuth();

	useEffect(() => {
		if (!user) return;
		setIsLoading(true);
		getUserScores(user.uid, activeDiff)
			.then(setScores)
			.catch((error) => {
				console.error("Failed to fetch scores:", error);
				setScores([]);
			})
			.finally(() => setIsLoading(false));
	}, [activeDiff, user]);

	const formatTime = (s: number) => {
		const mins = Math.floor(s / 60);
		const secs = s % 60;
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	};

	return (
		<Layout>
			<div className="page-container">
				<div className="content-wrapper flex-1">
					{/* Header */}
					<div className="w-full flex items-center gap-4 glass px-6 py-4 rounded-3xl border border-white/10 shadow-xl">
						<button
							type="button"
							onClick={() => navigate("/")}
							className="p-2 hover:bg-white/10 rounded-xl transition-all active:scale-90"
						>
							<ChevronLeft size={28} />
						</button>
						<div className="flex items-center gap-2 text-yellow-400">
							<Trophy size={24} />
							<h2 className="text-2xl font-black tracking-tight text-white">
								Statistics
							</h2>
						</div>
					</div>

					{/* Tabs */}
					<div className="w-full grid grid-cols-3 gap-2 glass mx-0 mb-2 rounded-2xl border border-white/5 p-2">
						{DIFFICULTIES.map((d) => (
							<button
								key={d.id}
								type="button"
								onClick={() => setActiveDiff(d.id)}
								className={`py-2 rounded-xl text-sm font-bold transition-all ${
									activeDiff === d.id
										? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20"
										: "text-slate-400 hover:text-white"
								}`}
							>
								{d.label}
							</button>
						))}
					</div>

					{/* Score List */}
					<div className="w-full h-full overflow-y-auto space-y-3 pr-1 custom-scrollbar min-h-0">
						{isLoading ? (
							<div className="flex flex-col items-center justify-center py-12 text-slate-500">
								<div className="w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mb-4" />
								<p className="font-medium">Loading scores...</p>
							</div>
						) : scores.length > 0 ? (
							scores.map((score, idx) => (
								<motion.div
									key={score.date.toMillis()}
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: idx * 0.05 }}
									onClick={() => {
										if (score.initial && score.solution) {
											navigate("/review", { state: score });
										}
									}}
									className={`flex items-center justify-between p-5 rounded-[1.5rem] bg-white/5 border border-white/5 transition-colors ${
										score.initial && score.solution
											? "cursor-pointer hover:bg-white/10"
											: ""
									}`}
								>
									<div className="flex items-center gap-4">
										<span
											className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${
												idx === 0
													? "bg-yellow-400 text-slate-900 shadow-lg shadow-yellow-400/20"
													: idx === 1
														? "bg-slate-300 text-slate-900 shadow-lg shadow-slate-300/20"
														: idx === 2
															? "bg-amber-600 text-white shadow-lg shadow-amber-600/20"
															: "bg-white/10 text-slate-400"
											}`}
										>
											{idx + 1}
										</span>
										<div>
											<p className="font-bold text-white text-lg">
												{score.date.toDate().toLocaleDateString(undefined, {
													month: "short",
													day: "numeric",
													year: "numeric",
												})}
											</p>
											<p className="text-xs text-slate-500 font-medium tracking-wide uppercase">
												{score.date.toDate().toLocaleTimeString(undefined, {
													hour: "numeric",
													minute: "2-digit",
												})}
											</p>
										</div>
									</div>
									<div className="flex items-center gap-2 text-brand-primary font-mono text-xl font-black">
										<Timer size={18} className="translate-y-[1px]" />
										<span>{formatTime(score.time)}</span>
									</div>
								</motion.div>
							))
						) : (
							<div className="text-center py-16 glass rounded-3xl border border-dashed border-white/10">
								<Trophy
									size={48}
									className="text-slate-700 mx-auto mb-4 opacity-20"
								/>
								<p className="text-slate-400 font-bold text-lg">
									No scores yet
								</p>
								<p className="text-sm text-slate-500">
									Be the first to claim victory!
								</p>
							</div>
						)}
					</div>
				</div>
			</div>
		</Layout>
	);
};
