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
import { subscribeToUser } from "./logic/firebase";
import { parsePuzzle, solveSudoku } from "./logic/sudoku";
import type { Board, CellNotes, Difficulty, GameAction } from "./types";

import { GamePage } from "./pages/GamePage";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { NewGamePage } from "./pages/NewGamePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ReviewPage } from "./pages/ReviewPage";
import { SettingsPage } from "./pages/SettingsPage";
import { SignupPage } from "./pages/SignupPage";
import { StatisticsPage } from "./pages/StatisticsPage";

export default function App() {
	const [gameState, setGameState] = useState<{
		initial: Board;
		current: Board;
		notes: CellNotes;
		solution: Board;
		actions: GameAction[];
	} | null>(null);

	const { user, loading: authLoading } = useAuth();
	const [difficulty, setDifficulty] = useState<Difficulty>("easy");
	const [isLoading, setIsLoading] = useState(true);
	const [theme, setTheme] = useState("default");

	const navigate = useNavigate();
	const location = useLocation();

	// Persistence effect: Subscribe to user data
	useEffect(() => {
		if (user) {
			setIsLoading(true);
			const unsubscribe = subscribeToUser(user.uid, (data) => {
				// Update theme
				setTheme(data.settings?.theme || "default");

				// Update game state
				if (data.gameState) {
					setGameState(data.gameState);
					// Initialize timer only if we are loading fresh
					// But since we sync constantly, we might want to stay in sync?
					// If we are playing, the local timer takes precedence?
					// Actually, simpler: just sync.
					// But we need to avoid jitter.
					// For now, let's sync. If user is playing, local updates will act as "optimistic" and write back.
					// Check if we strictly need to sync timer.
					// Let's protect timer from jumping back if local is ahead?
					// Nah, just set it.
					// Wait, if local timer is running, and we get an update, we might reset it?
					// But we are the only writer usually.
					// Unless multiple tabs.
					setTimer(data.gameState.timer);
				} else {
					setGameState(null);
					setTimer(0);
				}
				setIsLoading(false);
			});
			return () => unsubscribe();
		}

		if (!user && !authLoading) {
			setGameState(null);
			setTimer(0);
			setTheme("default");
			setIsLoading(false);
		}
	}, [user, authLoading]);

	// Theme effect - applied to DOM
	useEffect(() => {
		document.documentElement.setAttribute("data-theme", theme);
	}, [theme]);

	const [timer, setTimer] = useState(0);

	// Initialize a new game
	const startNewGame = useCallback(
		async (diff: Difficulty) => {
			setDifficulty(diff);

			let puzzleStr = "";
			try {
				const data = await import(`./data/${diff}.json`);
				const puzzles = data.default || data;
				const ids = Object.keys(puzzles);
				if (ids.length === 0) return;
				const randomId = ids[Math.floor(Math.random() * ids.length)];
				if (!randomId) return;
				puzzleStr = puzzles[randomId];
			} catch (e) {
				console.error("Failed to load puzzles", e);
				return;
			}

			if (!puzzleStr) return;
			const initial = parsePuzzle(puzzleStr);
			const solution = solveSudoku(initial);
			if (!solution) return;

			const notes: CellNotes = Array(9)
				.fill(null)
				.map(() =>
					Array(9)
						.fill(null)
						.map(() => new Set<number>()),
				);

			setGameState({
				initial,
				current: initial.map((r) => [...r]),
				notes,
				solution,
				actions: [],
			});
			setTimer(0);
			navigate("/game");
		},
		[navigate],
	);

	if (authLoading) {
		return (
			<div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
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
									!gameState.current.every((row, ri) =>
										row.every(
											(val, ci) => val === gameState.solution?.[ri]?.[ci],
										),
									)
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
							<SettingsPage currentTheme={theme} />
						</ProtectedRoute>
					}
				/>

				<Route
					path="/statistics"
					element={
						<ProtectedRoute>
							<StatisticsPage />
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
								<div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
									<div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
								</div>
							) : gameState ? (
								<GamePage
									user={user}
									gameState={gameState}
									setGameState={setGameState}
									timer={timer}
									setTimer={setTimer}
									difficulty={difficulty}
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
