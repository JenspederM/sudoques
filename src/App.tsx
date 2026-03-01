import {
	CheckCircleIcon,
	CircleXIcon,
	InfoIcon,
	MessageCircleWarningIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
	Navigate,
	Route,
	Routes,
	useLocation,
	useNavigate,
} from "react-router-dom";
import { Toaster, toast } from "sonner";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { UpdateNotification } from "@/components/UpdateNotification";
import { useAuth } from "@/contexts/AuthContext";
import { ScoresProvider } from "@/contexts/ScoresContext";
import { UserProvider, useUser } from "@/contexts/UserContext";
import { Spinner } from "./components/Spinner";
import {
	getRandomPuzzle,
	prefetchPuzzles,
	subscribeToGameState,
} from "./logic/firebase";
import { createEmptyNotes, isBoardComplete } from "./logic/sudoku";
import { GamePage } from "./pages/GamePage";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { NewGamePage } from "./pages/NewGamePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ReviewPage } from "./pages/ReviewPage";
import { SettingsPage } from "./pages/SettingsPage";
import { SignupPage } from "./pages/SignupPage";
import { StatisticsPage } from "./pages/StatisticsPage";
import type { Difficulty, GameState } from "./types";

function AppRoutes() {
	const { user, loading: authLoading } = useAuth();
	const [{ gameState, isLoading }, setGameSession] = useState<{
		gameState: Omit<GameState, "lastUpdated"> | null;
		isLoading: boolean;
	}>({
		gameState: null,
		isLoading: true,
	});

	const { accent, mode, playedPuzzles } = useUser();

	const navigate = useNavigate();
	const location = useLocation();

	// Persistence effect: Subscribe to Game State
	useEffect(() => {
		if (user) {
			// Realtime Game State subscription
			const unsubscribeGameState = subscribeToGameState(
				user.uid,
				(savedState) => {
					setGameSession({
						gameState: savedState || null,
						isLoading: false,
					});
				},
			);

			// Prefetch puzzles for offline use
			prefetchPuzzles();

			return () => {
				unsubscribeGameState();
			};
		}

		if (!user && !authLoading) {
			setGameSession({ gameState: null, isLoading: false });
		}
	}, [user, authLoading]);

	// Theme effect - applied to DOM
	useEffect(() => {
		document.documentElement.setAttribute("data-theme", accent);
		document.documentElement.setAttribute("data-mode", mode);
	}, [accent, mode]);

	// Initialize a new game
	const startNewGame = useCallback(
		async (diff: Difficulty) => {
			try {
				setGameSession((prev) => ({ ...prev, isLoading: true }));
				const puzzle = await getRandomPuzzle(diff, playedPuzzles);

				setGameSession({
					gameState: {
						puzzle,
						current: puzzle.initial.map((r) => [...r]),
						notes: createEmptyNotes(),
						actions: [],
						timer: 0,
					},
					isLoading: false,
				});
				navigate(`/game`);
			} catch (e) {
				console.error("Failed to load puzzles from Firestore", e);
				toast.error("Failed to fetch puzzle", {
					description: (e as Error).message,
				});
				setGameSession((prev) => ({ ...prev, isLoading: false }));
			}
		},
		[navigate, playedPuzzles],
	);

	if (authLoading) {
		return <Spinner />;
	}

	return (
		<>
			<Toaster
				position="bottom-center"
				expand={false}
				richColors
				icons={{
					error: <CircleXIcon className="w-4 h-4 text-red-500" />,
					success: <CheckCircleIcon className="w-4 h-4 text-green-500" />,
					info: <InfoIcon className="w-4 h-4 text-blue-500" />,
					warning: (
						<MessageCircleWarningIcon className="w-4 h-4 text-yellow-500" />
					),
				}}
				toastOptions={{
					style: {
						backgroundColor: "var(--card)",
						color: "var(--text-primary)",
						border: "1px solid var(--border)",
					},
					classNames: {
						title: "!text-foreground !font-bold",
						description: "!text-muted-foreground",
						actionButton: "!text-foreground !bg-primary !font-bold",
						cancelButton: "!text-foreground !bg-glass-dark !font-bold",
					},
				}}
			/>
			<UpdateNotification />
			<Routes location={location} key={location.pathname}>
				<Route path="/login" element={<LoginPage />} />
				<Route path="/signup" element={<SignupPage />} />
				<Route element={<ProtectedRoute />}>
					<Route
						path="/"
						element={
							<HomePage
								hasExistingGame={
									!!gameState &&
									!isBoardComplete(gameState.current, gameState.puzzle.solution)
								}
							/>
						}
					/>

					<Route
						path="/new-game"
						element={<NewGamePage onSelectDifficulty={startNewGame} />}
					/>

					<Route path="/settings" element={<SettingsPage />} />

					<Route path="/statistics" element={<StatisticsPage />} />

					<Route path="/review" element={<ReviewPage />} />

					<Route
						path="/game"
						element={
							isLoading ? (
								<Spinner />
							) : gameState ? (
								<GamePage
									user={user}
									gameState={gameState}
									timer={gameState.timer ?? 0}
								/>
							) : (
								<Navigate to="/new-game" replace />
							)
						}
					/>

					<Route path="*" element={<NotFoundPage />} />
				</Route>
			</Routes>
		</>
	);
}

export default function App() {
	return (
		<UserProvider>
			<ScoresProvider>
				<AppRoutes />
			</ScoresProvider>
		</UserProvider>
	);
}
