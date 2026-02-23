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
import { domAnimation, LazyMotion } from "framer-motion";
import { AuthProvider } from "@/components/AuthProvider";

function start() {
	const container = document.getElementById("root");
	if (container) {
		const root = createRoot(container);
		root.render(
			<LazyMotion features={domAnimation}>
				<BrowserRouter>
					<AuthProvider>
						<App />
					</AuthProvider>
				</BrowserRouter>
			</LazyMotion>,
		);
	}
}

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", start);
} else {
	start();
}
