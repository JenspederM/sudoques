import { AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import puzzlesData from "./data/puzzles.json";
import {
	type Board,
	type CellNotes,
	parsePuzzle,
	solveSudoku,
} from "./logic/sudoku";
import { loadGameState } from "./logic/firebase";
import { useAuth } from "./components/AuthProvider";
import { ProtectedRoute } from "./components/ProtectedRoute";

// Pages
import { HomePage } from "./pages/HomePage";
import { GamePage } from "./pages/GamePage";
import { SettingsPage } from "./pages/SettingsPage";
import { NewGamePage } from "./pages/NewGamePage";
import { LeaderboardPage } from "./pages/LeaderboardPage";
import { LoginPage } from "./pages/LoginPage";

type Difficulty = "25" | "27" | "30" | "35" | "40" | "45";

export default function App() {
	const [gameState, setGameState] = useState<{
		initial: Board;
		current: Board;
		notes: CellNotes;
		solution: Board;
	} | null>(null);

	const { user, loading: authLoading } = useAuth();
	const [difficulty, setDifficulty] = useState<Difficulty>("45");
	const [isLoading, setIsLoading] = useState(true);
	const [theme, setTheme] = useState(localStorage.getItem("theme") || "default");
    
    const navigate = useNavigate();
    const location = useLocation();

	// Persistence effect: Load game
	useEffect(() => {
		if (user && !gameState) {
			loadGameState(user.uid).then((saved) => {
				if (saved) {
					setGameState(saved);
					setTimer(saved.timer);
				}
                setIsLoading(false);
			});
		} else if (user && gameState) {
            setIsLoading(false);
        } else if (!user && !authLoading) {
            setIsLoading(false);
        }
	}, [user, authLoading, gameState]);

	// Theme effect
	useEffect(() => {
		document.documentElement.setAttribute("data-theme", theme);
		localStorage.setItem("theme", theme);
	}, [theme]);

	const [timer, setTimer] = useState(0);

	// Initialize a new game
	const startNewGame = useCallback((diff: Difficulty) => {
        setDifficulty(diff);
		const list = puzzlesData[
			diff as keyof typeof puzzlesData
		] as string[];
		if (!list || list.length === 0) return;
		const puzzleStr = list[Math.floor(Math.random() * list.length)];
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
		});
		setTimer(0);
        navigate("/game");
	}, [navigate]);

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
				
				<Route path="/" element={
					<ProtectedRoute>
						<HomePage hasExistingGame={!!gameState} />
					</ProtectedRoute>
				} />
				
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
							<SettingsPage
								currentTheme={theme}
								onThemeChange={setTheme}
							/>
						</ProtectedRoute>
					}
				/>
				
                <Route path="/leaderboard" element={
					<ProtectedRoute>
						<LeaderboardPage />
					</ProtectedRoute>
				} />
				
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
			</Routes>
		</AnimatePresence>
	);
}
