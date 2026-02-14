import { motion } from "framer-motion";
import { ChevronLeft, LogOut, Palette, User as UserIcon } from "lucide-react";
import type React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../components/AuthProvider";
import { Layout } from "../components/Layout";
import { updateUserSettings } from "../logic/firebase";

interface SettingsPageProps {
	currentTheme: string;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ currentTheme }) => {
	const navigate = useNavigate();
	const { user, signOut } = useAuth();

	const handleSignOut = async () => {
		try {
			await signOut();
			navigate("/login");
		} catch (error) {
			console.error("Error signing out:", error);
		}
	};

	const themes = [
		{ id: "default", name: "Indigo", color: "bg-[#6366f1]" },
		{ id: "rose", name: "Rose", color: "bg-[#f43f5e]" },
		{ id: "emerald", name: "Emerald", color: "bg-[#10b981]" },
		{ id: "amber", name: "Amber", color: "bg-[#f59e0b]" },
	];

	return (
		<Layout>
			<div className="page-container">
				<div className="content-wrapper">
					{/* Header */}
					<div className="w-full flex items-center gap-4 glass px-6 py-4 rounded-3xl border border-white/10 shadow-xl">
						<button
							type="button"
							onClick={() => navigate(-1)}
							className="p-2 hover:bg-white/10 rounded-xl transition-all active:scale-90"
						>
							<ChevronLeft size={28} />
						</button>
						<h2 className="text-2xl font-black tracking-tight">Settings</h2>
					</div>

					{/* Profile Section */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						className="w-full glass p-8 rounded-3xl border border-white/10 shadow-xl"
					>
						<div className="flex items-center gap-3 mb-6">
							<UserIcon size={24} className="text-brand-primary" />
							<h3 className="text-xl font-bold">Profile</h3>
						</div>

						<div className="flex flex-col gap-4">
							<div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
								<div className="w-12 h-12 rounded-full bg-brand-primary/20 flex items-center justify-center text-brand-primary">
									<UserIcon size={24} />
								</div>
								<div className="flex-1 min-w-0">
									<p className="font-bold text-white truncate">
										{user?.displayName || "Anonymous User"}
									</p>
									<p className="text-sm text-slate-500 truncate">
										{user?.email || "Guest Session"}
									</p>
								</div>
							</div>

							<button
								onClick={handleSignOut}
								className="w-full py-4 mt-2 flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl font-bold transition-all border border-red-500/20 active:scale-95"
							>
								<LogOut size={20} />
								<span>Sign Out</span>
							</button>
						</div>
					</motion.div>

					{/* Theme Section */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.1 }}
						className="w-full glass p-8 rounded-3xl border border-white/10 shadow-xl"
					>
						<div className="flex items-center gap-3 mb-6">
							<Palette size={24} className="text-brand-primary" />
							<h3 className="text-xl font-bold">Theme</h3>
						</div>

						<div className="grid grid-cols-2 gap-4">
							{themes.map((theme) => (
								<button
									type="button"
									key={theme.id}
									onClick={() => {
										if (user) {
											updateUserSettings(user.uid, { theme: theme.id });
										}
									}}
									className={`group flex flex-col items-center gap-3 p-4 rounded-2xl transition-all border-2 ${
										currentTheme === theme.id ||
										(currentTheme === "" && theme.id === "default")
											? "border-brand-primary bg-brand-primary/10 shadow-lg shadow-brand-primary/20"
											: "border-transparent glass hover:bg-white/5"
									}`}
								>
									<div
										className={`w-12 h-12 rounded-full ${theme.color} shadow-inner flex items-center justify-center`}
									>
										{currentTheme === theme.id && (
											<div className="w-3 h-3 bg-white rounded-full animate-pulse" />
										)}
									</div>
									<span
										className={`font-bold ${
											currentTheme === theme.id
												? "text-white"
												: "text-slate-400"
										}`}
									>
										{theme.name}
									</span>
								</button>
							))}
						</div>
					</motion.div>
				</div>
			</div>
		</Layout>
	);
};
