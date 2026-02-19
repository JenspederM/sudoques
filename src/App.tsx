import { AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import {
	Navigate,
	Route,
	Routes,
	useLocation,
	useNavigate,
} from "react-router-dom";
import { useAuth } from "./components/AuthProvider";
import { ProtectedRoute } from "./components/ProtectedRoute";
import {
	getRandomPuzzle,
	loadGameState,
	prefetchPuzzles,
	subscribeToUser,
	subscribeToUserScores,
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
import type { Accent, Difficulty, GameState, HighScore, Mode } from "./types";

export default function App() {
	const [gameState, setGameState] = useState<Omit<
		GameState,
		"lastUpdated" | "timer"
	> | null>(null);

	const { user, loading: authLoading } = useAuth();
	const [isLoading, setIsLoading] = useState(true);
	const [accent, setAccent] = useState<Accent>("default");
	const [mode, setMode] = useState<Mode>("dark");
	const [playedPuzzles, setPlayedPuzzles] = useState<string[]>([]);
	const [scores, setScores] = useState<HighScore[]>([]);

	const navigate = useNavigate();
	const location = useLocation();

	// Persistence effect: Subscribe to user data & scores
	useEffect(() => {
		if (user) {
			setIsLoading(true);

			// Metadata subscription (theme, played puzzles)
			const unsubscribeUser = subscribeToUser(user.uid, (data) => {
				setAccent(data.settings?.accent || "default");
				setMode(data.settings?.mode || "dark");
				setPlayedPuzzles(data.playedPuzzles || []);
			});

			// Scores subscription (pre-load for StatisticsPage)
			const unsubscribeScores = subscribeToUserScores(user.uid, (newScores) => {
				setScores(newScores);
			});

			// One-time Game State load (decoupled from subscription)
			loadGameState(user.uid).then((savedState) => {
				if (savedState) {
					setGameState(savedState);
					setTimer(savedState.timer);
				} else {
					setGameState(null);
					setTimer(0);
				}
				setIsLoading(false);
			});

			// Prefetch puzzles for offline use
			prefetchPuzzles();

			return () => {
				unsubscribeUser();
				unsubscribeScores();
			};
		}

		if (!user && !authLoading) {
			setGameState(null);
			setTimer(0);
			setAccent("default");
			setMode("dark");
			setPlayedPuzzles([]);
			setScores([]);
			setIsLoading(false);
		}
	}, [user, authLoading]);

	// Theme effect - applied to DOM
	useEffect(() => {
		document.documentElement.setAttribute("data-theme", accent);
		document.documentElement.setAttribute("data-mode", mode);
	}, [accent, mode]);

	const [timer, setTimer] = useState(0);

	// Initialize a new game
	const startNewGame = useCallback(
		async (diff: Difficulty) => {
			try {
				setIsLoading(true);
				const puzzle = await getRandomPuzzle(diff, playedPuzzles);

				setGameState({
					puzzle,
					current: puzzle.initial.map((r) => [...r]),
					notes: createEmptyNotes(),
					actions: [],
				});
				setTimer(0);
				navigate("/game");
			} catch (e) {
				console.error("Failed to load puzzles from Firestore", e);
				alert("Failed to fetch puzzle. Please try again.");
			} finally {
				setIsLoading(false);
			}
		},
		[navigate, playedPuzzles],
	);

	if (authLoading) {
		return (
			<div className="min-h-screen bg-surface-main flex items-center justify-center text-text-primary">
				<div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
			</div>
		);
	}

	return (
		<AnimatePresence mode="wait">
			<Routes location={location} key={location.pathname}>
				<Route path="/login" element={<LoginPage />} />
				<Route path="/signup" element={<SignupPage />} />

				<Route
					path="/"
					element={
						<ProtectedRoute>
							<HomePage
								hasExistingGame={
									!!gameState &&
									!isBoardComplete(gameState.current, gameState.puzzle.solution)
								}
							/>
						</ProtectedRoute>
					}
				/>

				<Route
					path="/new-game"
					element={
						<ProtectedRoute>
							<NewGamePage onSelectDifficulty={startNewGame} />
						</ProtectedRoute>
					}
				/>

				<Route
					path="/settings"
					element={
						<ProtectedRoute>
							<SettingsPage currentAccent={accent} currentMode={mode} />
						</ProtectedRoute>
					}
				/>

				<Route
					path="/statistics"
					element={
						<ProtectedRoute>
							<StatisticsPage scores={scores} />
						</ProtectedRoute>
					}
				/>

				<Route
					path="/review"
					element={
						<ProtectedRoute>
							<ReviewPage />
						</ProtectedRoute>
					}
				/>

				<Route
					path="/game"
					element={
						<ProtectedRoute>
							{isLoading ? (
								<div className="min-h-screen bg-surface-main flex items-center justify-center text-text-primary">
									<div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
								</div>
							) : gameState ? (
								<GamePage
									user={user}
									gameState={gameState}
									setGameState={setGameState}
									timer={timer}
									setTimer={setTimer}
								/>
							) : (
								<Navigate to="/new-game" replace />
							)}
						</ProtectedRoute>
					}
				/>
				<Route path="*" element={<NotFoundPage />} />
			</Routes>
		</AnimatePresence>
	);
}
