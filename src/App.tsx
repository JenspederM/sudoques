import {
	CheckCircleIcon,
	CircleXIcon,
	InfoIcon,
	MessageCircleWarningIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
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
	markPuzzleAsPlayed,
	prefetchPuzzles,
	saveGameState,
	subscribeToGameState,
} from "./logic/firebase";
import {
	clearGuestGameState,
	loadGuestGameState,
	resolveGuestGameState,
	saveGuestGameState,
} from "./logic/guestGameStorage";
import { syncPuzzleHistorySession } from "./logic/puzzleSelection";
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

function loadActiveGuestGame() {
	const snapshot = loadGuestGameState();
	if (
		snapshot &&
		isBoardComplete(snapshot.state.current, snapshot.state.puzzle.solution)
	) {
		clearGuestGameState();
		return null;
	}
	return snapshot;
}

function AppRoutes() {
	const { user, loading: authLoading } = useAuth();
	const [storedGameSession, setGameSession] = useState<{
		gameState: Omit<GameState, "lastUpdated"> | null;
		isLoading: boolean;
		userId: string | null;
	}>({
		gameState: null,
		isLoading: true,
		userId: null,
	});

	const { accent, mode, playedPuzzles, playedPuzzlesReady } = useUser();
	const activeUserId = user?.uid ?? null;
	const activeUserIdRef = useRef(activeUserId);
	activeUserIdRef.current = activeUserId;
	const { gameState, isLoading } =
		storedGameSession.userId === activeUserId
			? storedGameSession
			: { gameState: null, isLoading: true };
	const puzzleHistorySessionRef = useRef({
		userId: activeUserId,
		puzzleIds: new Set<string>(),
	});
	const newGameRequestRef = useRef<{
		generation: number;
		userId: string | null;
	}>({ generation: 0, userId: null });

	const navigate = useNavigate();
	const location = useLocation();

	// Persistence effect: Subscribe to Game State
	useEffect(() => {
		if (user) {
			let isCurrentUser = true;
			const subscribedUserId = user.uid;
			const initialLocalGuestGame = loadActiveGuestGame();
			if (initialLocalGuestGame) {
				setGameSession({
					gameState: initialLocalGuestGame.state,
					isLoading: false,
					userId: subscribedUserId,
				});
			} else {
				setGameSession({
					gameState: null,
					isLoading: true,
					userId: subscribedUserId,
				});
			}

			// Realtime Game State subscription
			const unsubscribeGameState = subscribeToGameState(
				subscribedUserId,
				(savedState, metadata) => {
					if (!isCurrentUser || activeUserIdRef.current !== subscribedUserId)
						return;

					const latestLocalGuestGame = loadActiveGuestGame();
					const resolved = resolveGuestGameState(
						savedState,
						latestLocalGuestGame,
						metadata,
					);

					if (resolved.source === "cloud" && user.isAnonymous && savedState) {
						if (
							isBoardComplete(savedState.current, savedState.puzzle.solution)
						) {
							clearGuestGameState();
						} else {
							saveGuestGameState(subscribedUserId, savedState);
						}
					}
					if (resolved.source === "cloud" && !user.isAnonymous) {
						clearGuestGameState();
					}
					setGameSession({
						gameState: resolved.state,
						isLoading: false,
						userId: subscribedUserId,
					});

					if (resolved.shouldUploadLocal && resolved.state) {
						saveGameState(subscribedUserId, resolved.state)
							.then(() => {
								if (
									!isCurrentUser ||
									activeUserIdRef.current !== subscribedUserId
								)
									return;
								if (!user.isAnonymous) clearGuestGameState();
							})
							.catch((error) => {
								console.error(
									"Failed to restore guest game to Firebase",
									error,
								);
							});
					}
				},
			);

			// Prefetch puzzles for offline use
			prefetchPuzzles();

			return () => {
				isCurrentUser = false;
				unsubscribeGameState();
			};
		}

		if (!user && !authLoading) {
			setGameSession({ gameState: null, isLoading: false, userId: null });
		}
	}, [user, authLoading]);

	// Theme effect - applied to DOM
	useEffect(() => {
		document.documentElement.setAttribute("data-theme", accent);
		document.documentElement.setAttribute("data-mode", mode);
	}, [accent, mode]);

	useEffect(() => {
		puzzleHistorySessionRef.current = syncPuzzleHistorySession(
			puzzleHistorySessionRef.current,
			activeUserId,
			playedPuzzlesReady ? playedPuzzles : [],
		);
	}, [activeUserId, playedPuzzles, playedPuzzlesReady]);

	useEffect(() => {
		if (
			newGameRequestRef.current.userId !== null &&
			newGameRequestRef.current.userId !== activeUserId
		) {
			newGameRequestRef.current = {
				generation: newGameRequestRef.current.generation + 1,
				userId: null,
			};
		}
	}, [activeUserId]);

	// Initialize a new game
	const startNewGame = useCallback(
		async (diff: Difficulty) => {
			if (!playedPuzzlesReady) return;
			const startingUserId = activeUserId;
			if (!startingUserId) return;
			if (newGameRequestRef.current.userId === startingUserId) return;
			const requestId = newGameRequestRef.current.generation + 1;
			newGameRequestRef.current = {
				generation: requestId,
				userId: startingUserId,
			};
			try {
				setGameSession((prev) =>
					prev.userId === startingUserId ? { ...prev, isLoading: true } : prev,
				);
				const historySession = syncPuzzleHistorySession(
					puzzleHistorySessionRef.current,
					activeUserId,
					playedPuzzles,
				);
				puzzleHistorySessionRef.current = historySession;
				const currentPuzzleId = gameState?.puzzle.id;
				const excludedPuzzleIds = new Set([
					...playedPuzzles,
					...historySession.puzzleIds,
				]);
				if (currentPuzzleId) excludedPuzzleIds.add(currentPuzzleId);

				const puzzle = await getRandomPuzzle(
					diff,
					Array.from(excludedPuzzleIds),
					currentPuzzleId,
				);
				if (
					activeUserIdRef.current !== startingUserId ||
					newGameRequestRef.current.generation !== requestId
				) {
					return;
				}
				historySession.puzzleIds.add(puzzle.id);
				if (user?.uid === startingUserId) {
					markPuzzleAsPlayed(startingUserId, puzzle.id).catch((error) => {
						console.error("Failed to remember selected puzzle", error);
					});
				}

				const newGameState = {
					puzzle,
					current: puzzle.initial.map((r) => [...r]),
					notes: createEmptyNotes(),
					actions: [],
					timer: 0,
				};

				if (user?.isAnonymous) {
					saveGuestGameState(user.uid, newGameState);
				} else {
					clearGuestGameState();
				}

				if (user) {
					saveGameState(user.uid, newGameState).catch((error) => {
						console.error("Failed to save new game state to Firebase", error);
					});
				}

				setGameSession({
					gameState: newGameState,
					isLoading: false,
					userId: startingUserId,
				});
				navigate(`/game`);
			} catch (e) {
				if (
					activeUserIdRef.current !== startingUserId ||
					newGameRequestRef.current.generation !== requestId
				)
					return;
				console.error("Failed to load puzzles from Firestore", e);
				toast.error("Failed to fetch puzzle", {
					description: (e as Error).message,
				});
				setGameSession((prev) =>
					prev.userId === startingUserId ? { ...prev, isLoading: false } : prev,
				);
			} finally {
				if (newGameRequestRef.current.generation === requestId) {
					newGameRequestRef.current = {
						generation: requestId,
						userId: null,
					};
				}
			}
		},
		[
			activeUserId,
			gameState?.puzzle.id,
			navigate,
			playedPuzzles,
			playedPuzzlesReady,
			user,
		],
	);

	if (authLoading || (user && !playedPuzzlesReady)) {
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
