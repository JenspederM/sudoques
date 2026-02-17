/**
 * This file is the entry point for the React app, it sets up the root
 * element and renders the App component to the DOM.
 *
 * It is included in `src/index.html`.
 */

import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { AuthProvider } from "./components/AuthProvider";

function start() {
	const container = document.getElementById("root");
	if (container) {
		const root = createRoot(container);
		root.render(
			<BrowserRouter>
				<AuthProvider>
					<App />
				</AuthProvider>
			</BrowserRouter>,
		);
	}
}

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", start);
} else {
	start();
}

// Register Service Worker in production
if (
	typeof window !== "undefined" &&
	"serviceWorker" in navigator &&
	process.env.NODE_ENV === "production"
) {
	window.addEventListener("load", () => {
		navigator.serviceWorker
			.register("/sw.js")
			.then((reg) => {
				console.log("Sudoques PWA SW registered:", reg.scope);
			})
			.catch((err) => {
				console.error("Sudoques PWA SW failed:", err);
			});
	});
}
