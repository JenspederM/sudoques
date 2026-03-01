import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { m } from "framer-motion";
import { Loader2, Lock, Mail, User as UserIcon } from "lucide-react";
import type { SubmitEvent } from "react";
import { useReducer } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BrandHeader } from "@/components/BrandHeader";
import { Layout } from "@/components/Layout";
import { auth } from "@/firebase";

interface SignupState {
	email: string;
	password: string;
	name: string;
	error: string | null;
	loading: boolean;
}

const initialState: SignupState = {
	email: "",
	password: "",
	name: "",
	error: null,
	loading: false,
};

type SignupAction =
	| { type: "SET_FIELD"; field: keyof SignupState; value: string }
	| { type: "SUBMIT_START" }
	| { type: "SUBMIT_ERROR"; error: string };

function signupReducer(state: SignupState, action: SignupAction): SignupState {
	switch (action.type) {
		case "SET_FIELD":
			return { ...state, [action.field]: action.value };
		case "SUBMIT_START":
			return { ...state, error: null, loading: true };
		case "SUBMIT_ERROR":
			return { ...state, error: action.error, loading: false };
		default:
			return state;
	}
}

export const SignupPage: React.FC = () => {
	const [state, dispatch] = useReducer(signupReducer, initialState);
	const { email, password, name, error, loading } = state;

	const navigate = useNavigate();
	const location = useLocation();
	const from = location.state?.from?.pathname || "/";

	const handleSignup = async (e: SubmitEvent) => {
		e.preventDefault();
		dispatch({ type: "SUBMIT_START" });
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
		} catch (err: unknown) {
			dispatch({
				type: "SUBMIT_ERROR",
				error: err instanceof Error ? err.message : "An error occurred",
			});
		}
	};

	return (
		<Layout centered>
			<m.div
				initial={{ opacity: 0, scale: 0.9 }}
				animate={{ opacity: 1, scale: 1 }}
				className="flex flex-col items-center bg-glass rounded-2xl border border-border px-6 py-4 w-full"
			>
				<div className="flex flex-col items-center mb-4">
					<BrandHeader subtitle="Create account" />
				</div>

				{error && (
					<div className="w-full p-4 mb-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">
						{error}
					</div>
				)}

				<form onSubmit={handleSignup} className="w-full flex flex-col gap-4">
					<div className="relative">
						<UserIcon
							className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
							size={20}
						/>
						<input
							type="text"
							placeholder="Your Name"
							value={name}
							onChange={(e) =>
								dispatch({
									type: "SET_FIELD",
									field: "name",
									value: e.target.value,
								})
							}
							className="w-full py-4 pl-12 pr-4 rounded-2xl bg-secondary border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
						/>
					</div>

					<div className="relative">
						<Mail
							className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
							size={20}
						/>
						<input
							type="email"
							placeholder="Email Address"
							value={email}
							onChange={(e) =>
								dispatch({
									type: "SET_FIELD",
									field: "email",
									value: e.target.value,
								})
							}
							className="w-full py-4 pl-12 pr-4 rounded-2xl bg-secondary border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
							required
						/>
					</div>
					<div className="relative">
						<Lock
							className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
							size={20}
						/>
						<input
							type="password"
							placeholder="Password"
							value={password}
							onChange={(e) =>
								dispatch({
									type: "SET_FIELD",
									field: "password",
									value: e.target.value,
								})
							}
							className="w-full py-4 pl-12 pr-4 rounded-2xl bg-secondary border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
							required
						/>
					</div>

					<button
						type="submit"
						disabled={loading}
						className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/30 active:scale-95 transition-all flex items-center justify-center gap-2"
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
					className="mt-8 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
				>
					Already have an account? Sign In
				</button>
			</m.div>
		</Layout>
	);
};
