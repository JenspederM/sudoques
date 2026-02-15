import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { Brain, Loader2, Lock, Mail, User as UserIcon } from "lucide-react";
import type { SubmitEvent } from "react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MotionCard, MotionCardTitle } from "@/components/MotionCard";
import { Layout } from "../components/Layout";
import { auth } from "../firebase";

export const SignupPage: React.FC = () => {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [name, setName] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const navigate = useNavigate();
	const location = useLocation();
	const from = location.state?.from?.pathname || "/";

	const handleSignup = async (e: SubmitEvent) => {
		e.preventDefault();
		setError(null);
		setLoading(true);
		try {
			const userCredential = await createUserWithEmailAndPassword(
				auth,
				email,
				password,
			);
			if (name) {
				await updateProfile(userCredential.user, { displayName: name });
			}
			navigate(from, { replace: true });
		} catch (err: any) {
			setError(err.message);
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
					<p className="text-slate-400 font-medium">Create account</p>
				</MotionCardTitle>

				{error && (
					<div className="w-full p-4 mb-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">
						{error}
					</div>
				)}

				<form onSubmit={handleSignup} className="w-full flex flex-col gap-4">
					<div className="relative">
						<UserIcon
							className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
							size={20}
						/>
						<input
							type="text"
							placeholder="Your Name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							className="w-full py-4 pl-12 pr-4 rounded-2xl bg-white/5 border border-white/10 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-all"
						/>
					</div>

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
							"Sign Up"
						)}
					</button>
				</form>

				<button
					type="button"
					onClick={() => navigate("/login")}
					className="mt-8 text-sm font-medium text-slate-400 hover:text-brand-primary transition-colors"
				>
					Already have an account? Sign In
				</button>
			</MotionCard>
		</Layout>
	);
};
