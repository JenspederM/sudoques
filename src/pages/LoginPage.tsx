import {
	GoogleAuthProvider,
	signInAnonymously,
	signInWithEmailAndPassword,
	signInWithPopup,
} from "firebase/auth";
import { Brain, Loader2, Lock, Mail } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MotionCard, MotionCardTitle } from "@/components/MotionCard";
import { Layout } from "../components/Layout";
import { auth } from "../firebase";

export const LoginPage: React.FC = () => {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const navigate = useNavigate();
	const location = useLocation();
	const from = location.state?.from?.pathname || "/";

	const handleEmailAuth = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setLoading(true);
		try {
			await signInWithEmailAndPassword(auth, email, password);
			navigate(from, { replace: true });
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : "An error occurred");
		} finally {
			setLoading(false);
		}
	};

	const handleGoogleAuth = async () => {
		setError(null);
		setLoading(true);
		try {
			const provider = new GoogleAuthProvider();
			await signInWithPopup(auth, provider);
			navigate(from, { replace: true });
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : "An error occurred");
		} finally {
			setLoading(false);
		}
	};

	const handleAnonymousAuth = async () => {
		setError(null);
		setLoading(true);
		try {
			await signInAnonymously(auth);
			navigate(from, { replace: true });
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : "An error occurred");
		} finally {
			setLoading(false);
		}
	};

	return (
		<Layout contentClassName="justify-center">
			<MotionCard
				initial={{ opacity: 0, scale: 0.9 }}
				animate={{ opacity: 1, scale: 1 }}
				className="flex flex-col items-center"
			>
				<MotionCardTitle className="flex flex-col items-center gap-0">
					<div className="bg-brand-primary/20 w-24 h-24 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-brand-primary/20 border border-brand-primary/30">
						<Brain size={56} className="text-brand-primary" />
					</div>
					<span className="text-5xl font-black mb-2 bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-primary bg-[length:200%_auto] bg-clip-text text-transparent animate-gradient tracking-tight">
						Sudoques
					</span>
					<p className="text-slate-400 font-medium">Welcome Back</p>
				</MotionCardTitle>

				{error && (
					<div className="w-full p-4 mb-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">
						{error}
					</div>
				)}

				<form onSubmit={handleEmailAuth} className="w-full flex flex-col gap-4">
					<div className="relative">
						<Mail
							className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
							size={20}
						/>
						<input
							type="email"
							placeholder="Email Address"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							className="w-full py-4 pl-12 pr-4 rounded-2xl bg-white/5 border border-white/10 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-all"
							required
						/>
					</div>
					<div className="relative">
						<Lock
							className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
							size={20}
						/>
						<input
							type="password"
							placeholder="Password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							className="w-full py-4 pl-12 pr-4 rounded-2xl bg-white/5 border border-white/10 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-all"
							required
						/>
					</div>

					<button
						type="submit"
						disabled={loading}
						className="w-full py-4 bg-brand-primary text-white font-bold rounded-2xl shadow-lg shadow-brand-primary/30 active:scale-95 transition-all flex items-center justify-center gap-2"
					>
						{loading ? (
							<Loader2 className="animate-spin" size={20} />
						) : (
							"Sign In"
						)}
					</button>
				</form>

				<div className="w-full flex items-center gap-4 my-8">
					<div className="h-[1px] flex-1 bg-white/10" />
					<span className="text-slate-500 text-xs font-bold uppercase tracking-widest">
						or
					</span>
					<div className="h-[1px] flex-1 bg-white/10" />
				</div>

				<div className="w-full flex flex-col gap-3">
					<button
						type="button"
						onClick={handleGoogleAuth}
						disabled={loading}
						className="w-full py-4 glass hover:bg-white/10 text-white font-bold rounded-2xl border border-white/10 transition-all flex items-center justify-center gap-3"
					>
						<img
							src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
							alt="Google"
							className="w-5 h-5"
						/>
						<span>Continue with Google</span>
					</button>

					<button
						type="button"
						onClick={handleAnonymousAuth}
						disabled={loading}
						className="w-full py-4 text-slate-400 hover:text-white font-bold transition-all text-sm"
					>
						Continue as Guest
					</button>
				</div>

				<button
					type="button"
					onClick={() => navigate("/signup")}
					className="mt-2 text-sm font-medium text-slate-400 hover:text-brand-primary transition-colors"
				>
					Don't have an account? Sign Up
				</button>
			</MotionCard>
		</Layout>
	);
};
