import { LogOut, Moon, Palette, Sun, User as UserIcon } from "lucide-react";
import type React from "react";
import { useNavigate } from "react-router-dom";
import {
	MotionCard,
	MotionCardContent,
	MotionCardTitle,
} from "@/components/MotionCard";
import { useAuth } from "../components/AuthProvider";
import { Layout } from "../components/Layout";
import { updateUserSettings } from "../logic/firebase";
import type { Accent, Mode } from "../types";

interface SettingsPageProps {
	currentAccent: Accent;
	currentMode: Mode;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
	currentAccent,
	currentMode,
}) => {
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

	const handleChangeAccent = (accent: Accent) => {
		if (user) {
			updateUserSettings(user.uid, { accent });
		}
	};

	const handleChangeMode = (mode: Mode) => {
		if (user) {
			updateUserSettings(user.uid, { mode });
		}
	};

	const accents: { id: Accent; name: string; color: string }[] = [
		{ id: "default", name: "Indigo", color: "bg-[#6366f1]" },
		{ id: "rose", name: "Rose", color: "bg-[#f43f5e]" },
		{ id: "emerald", name: "Emerald", color: "bg-[#10b981]" },
		{ id: "amber", name: "Amber", color: "bg-[#f59e0b]" },
	];

	return (
		<Layout
			backRedirect="/"
			headerCenter={
				<h2 className="text-2xl font-black tracking-tight">Settings</h2>
			}
		>
			{/* Profile Section */}
			<MotionCard
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
			>
				<MotionCardTitle className="flex items-center gap-3">
					<UserIcon size={24} className="text-brand-primary" />
					<span className="text-xl font-bold">Profile</span>
				</MotionCardTitle>
				<MotionCardContent>
					<div className="flex items-center gap-4 p-4 rounded-2xl bg-surface-input border border-border-subtle">
						<div className="w-12 h-12 rounded-full bg-brand-primary/20 flex items-center justify-center text-brand-primary">
							<UserIcon size={24} />
						</div>
						<div className="flex-1 min-w-0">
							<p className="font-bold text-text-primary truncate">
								{user?.displayName || "Anonymous User"}
							</p>
							<p className="text-sm text-text-muted truncate">
								{user?.email || "Guest Session"}
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={handleSignOut}
						className="w-full py-4 mt-2 flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl font-bold transition-all border border-red-500/20 active:scale-95"
					>
						<LogOut size={20} />
						<span>Sign Out</span>
					</button>
				</MotionCardContent>
			</MotionCard>

			{/* Mode Section */}
			<MotionCard
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.05 }}
			>
				<MotionCardTitle className="flex items-center gap-3">
					{currentMode === "dark" ? (
						<Moon size={24} className="text-brand-primary" />
					) : (
						<Sun size={24} className="text-brand-primary" />
					)}
					<span className="text-xl font-bold">Mode</span>
				</MotionCardTitle>
				<MotionCardContent className="grid grid-cols-2 gap-3">
					<button
						type="button"
						onClick={() => handleChangeMode("light")}
						className={`group flex flex-col items-center gap-3 p-4 rounded-2xl transition-all border-2 ${
							currentMode === "light"
								? "border-brand-primary bg-brand-primary/10 shadow-lg shadow-brand-primary/20"
								: "border-transparent glass hover:bg-surface-hover"
						}`}
					>
						<div
							className={`w-12 h-12 rounded-full bg-amber-100 shadow-inner flex items-center justify-center ${
								currentMode === "light" ? "ring-2 ring-brand-primary" : ""
							}`}
						>
							<Sun
								size={24}
								className={
									currentMode === "light" ? "text-amber-500" : "text-amber-400"
								}
							/>
						</div>
						<span
							className={`font-bold ${
								currentMode === "light"
									? "text-text-primary"
									: "text-text-secondary"
							}`}
						>
							Light
						</span>
					</button>
					<button
						type="button"
						onClick={() => handleChangeMode("dark")}
						className={`group flex flex-col items-center gap-3 p-4 rounded-2xl transition-all border-2 ${
							currentMode === "dark"
								? "border-brand-primary bg-brand-primary/10 shadow-lg shadow-brand-primary/20"
								: "border-transparent glass hover:bg-surface-hover"
						}`}
					>
						<div
							className={`w-12 h-12 rounded-full bg-slate-800 shadow-inner flex items-center justify-center ${
								currentMode === "dark" ? "ring-2 ring-brand-primary" : ""
							}`}
						>
							<Moon
								size={24}
								className={
									currentMode === "dark" ? "text-indigo-300" : "text-slate-400"
								}
							/>
						</div>
						<span
							className={`font-bold ${
								currentMode === "dark"
									? "text-text-primary"
									: "text-text-secondary"
							}`}
						>
							Dark
						</span>
					</button>
				</MotionCardContent>
			</MotionCard>

			{/* Accent Color Section */}
			<MotionCard
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.1 }}
			>
				<MotionCardTitle className="flex items-center gap-3">
					<Palette size={24} className="text-brand-primary" />
					<span className="text-xl font-bold">Accent</span>
				</MotionCardTitle>
				<MotionCardContent className="grid grid-cols-2 gap-3">
					{accents.map((a) => (
						<button
							type="button"
							key={a.id}
							onClick={() => handleChangeAccent(a.id)}
							className={`group flex flex-col items-center gap-3 p-4 rounded-2xl transition-all border-2 ${
								currentAccent === a.id
									? "border-brand-primary bg-brand-primary/10 shadow-lg shadow-brand-primary/20"
									: "border-transparent glass hover:bg-surface-hover"
							}`}
						>
							<div
								className={`w-12 h-12 rounded-full ${a.color} shadow-inner flex items-center justify-center`}
							>
								{currentAccent === a.id && (
									<div className="w-3 h-3 bg-white rounded-full animate-pulse" />
								)}
							</div>
							<span
								className={`font-bold ${
									currentAccent === a.id
										? "text-text-primary"
										: "text-text-secondary"
								}`}
							>
								{a.name}
							</span>
						</button>
					))}
				</MotionCardContent>
			</MotionCard>
		</Layout>
	);
};
