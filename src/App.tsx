import {
	CheckCircleIcon,
	CircleXIcon,
	InfoIcon,
	MessageCircleWarningIcon,
} from "lucide-react";
import { useCallback, useEffect, useReducer } from "react";
import {
	Navigate,
	Route,
	Routes,
	useLocation,
	useNavigate,
} from "react-router-dom";
import { Toaster, toast } from "sonner";
import { useAuth } from "@/components/AuthProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { UpdateNotification } from "@/components/UpdateNotification";
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

interface AppState {
	gameState: Omit<GameState, "lastUpdated" | "timer"> | null;
	isLoading: boolean;
	accent: Accent;
	mode: Mode;
	playedPuzzles: string[];
	scores: HighScore[];
	timer: number;
}

type AppAction =
	| { type: "SET_LOADING"; payload: boolean }
	| {
			type: "SET_USER_DATA";
			payload: { accent: Accent; mode: Mode; playedPuzzles: string[] };
	  }
	| { type: "SET_SCORES"; payload: HighScore[] }
	| {
			type: "SET_GAME_STATE";
			payload: { gameState: AppState["gameState"]; timer: number };
	  }
	| { type: "UPDATE_GAME_STATE"; payload: AppState["gameState"] }
	| { type: "SET_TIMER"; payload: number | ((prev: number) => number) }
	| { type: "RESET_STATE" };

const initialAppState: AppState = {
	gameState: null,
	isLoading: true,
	accent: "default",
	mode: "dark",
	playedPuzzles: [],
	scores: [],
	timer: 0,
};

function appReducer(state: AppState, action: AppAction): AppState {
	switch (action.type) {
		case "SET_LOADING":
			return { ...state, isLoading: action.payload };
		case "SET_USER_DATA":
			return { ...state, ...action.payload };
		case "SET_SCORES":
			return { ...state, scores: action.payload };
		case "SET_GAME_STATE":
			return {
				...state,
				gameState: action.payload.gameState,
				timer: action.payload.timer,
			};
		case "UPDATE_GAME_STATE":
			return { ...state, gameState: action.payload };
		case "SET_TIMER":
			return {
				...state,
				timer:
					typeof action.payload === "function"
						? action.payload(state.timer)
						: action.payload,
			};
		case "RESET_STATE":
			return { ...initialAppState, isLoading: false };
		default:
			return state;
	}
}

export default function App() {
	const [state, dispatch] = useReducer(appReducer, initialAppState);
	const { gameState, isLoading, accent, mode, playedPuzzles, scores, timer } =
		state;

	const { user, loading: authLoading } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();

	// Persistence effect: Subscribe to user data & scores
	useEffect(() => {
		if (user) {
			dispatch({ type: "SET_LOADING", payload: true });

			// Metadata subscription (theme, played puzzles)
			const unsubscribeUser = subscribeToUser(user.uid, (data) => {
				dispatch({
					type: "SET_USER_DATA",
					payload: {
						accent: data.settings?.accent || "default",
						mode: data.settings?.mode || "dark",
						playedPuzzles: data.playedPuzzles || [],
					},
				});
			});

			// Scores subscription (pre-load for StatisticsPage)
			const unsubscribeScores = subscribeToUserScores(user.uid, (newScores) => {
				dispatch({ type: "SET_SCORES", payload: newScores });
			});

			// One-time Game State load (decoupled from subscription)
			loadGameState(user.uid).then((savedState) => {
				if (savedState) {
					dispatch({
						type: "SET_GAME_STATE",
						payload: { gameState: savedState, timer: savedState.timer },
					});
				} else {
					dispatch({
						type: "SET_GAME_STATE",
						payload: { gameState: null, timer: 0 },
					});
				}
				dispatch({ type: "SET_LOADING", payload: false });
			});

			// Prefetch puzzles for offline use
			prefetchPuzzles();

			return () => {
				unsubscribeUser();
				unsubscribeScores();
			};
		}

		if (!user && !authLoading) {
			dispatch({ type: "RESET_STATE" });
		}
	}, [user, authLoading]);

	// Theme effect - applied to DOM
	useEffect(() => {
		document.documentElement.setAttribute("data-theme", accent);
		document.documentElement.setAttribute("data-mode", mode);
	}, [accent, mode]);

	const setGameState = useCallback((newState: AppState["gameState"]) => {
		dispatch({ type: "UPDATE_GAME_STATE", payload: newState });
	}, []);

	const setTimer = useCallback((t: number | ((prev: number) => number)) => {
		dispatch({ type: "SET_TIMER", payload: t });
	}, []);

	// Initialize a new game
	const startNewGame = useCallback(
		async (diff: Difficulty) => {
			try {
				dispatch({ type: "SET_LOADING", payload: true });
				const puzzle = await getRandomPuzzle(diff, playedPuzzles);

				dispatch({
					type: "SET_GAME_STATE",
					payload: {
						gameState: {
							puzzle,
							current: puzzle.initial.map((r) => [...r]),
							notes: createEmptyNotes(),
							actions: [],
						},
						timer: 0,
					},
				});
				navigate(`/game`);
			} catch (e) {
				console.error("Failed to load puzzles from Firestore", e);
				toast.error("Failed to fetch puzzle", {
					description: (e as Error).message,
				});
			} finally {
				dispatch({ type: "SET_LOADING", payload: false });
			}
		},
		[navigate, playedPuzzles],
	);

	if (authLoading) {
		return (
			<div className="min-h-screen bg-background flex items-center justify-center text-foreground">
				<div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
			</div>
		);
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

					<Route
						path="/settings"
						element={<SettingsPage currentAccent={accent} currentMode={mode} />}
					/>

					<Route
						path="/statistics"
						element={<StatisticsPage scores={scores} />}
					/>

					<Route path="/review" element={<ReviewPage />} />

					<Route
						path="/game"
						element={
							isLoading ? (
								<div className="min-h-screen bg-background flex items-center justify-center text-foreground">
									<div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
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
							)
						}
					/>

					<Route path="*" element={<NotFoundPage />} />
				</Route>
			</Routes>
		</>
	);
}
