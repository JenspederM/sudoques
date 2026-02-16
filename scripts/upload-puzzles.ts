import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { 
	collection, 
	writeBatch, 
	doc, 
	getFirestore, 
	connectFirestoreEmulator 
} from "firebase/firestore";
import { initializeApp } from "firebase/app";
import type { PuzzleData } from "./types";

const firebaseConfig = {
	apiKey: process.env.BUN_PUBLIC_FIREBASE_API_KEY || "fake-api-key",
	authDomain: "sudoques.firebaseapp.com",
	projectId: "sudoques",
	storageBucket: "sudoques.firebasestorage.app",
	messagingSenderId: "93891219633",
	appId: "1:93891219633:web:c4983a874faf7ea4695290",
};

const DATA_DIR = join(process.cwd(), "src/data");
const COLLECTION_NAME = "puzzles";
const BATCH_SIZE = 500;

async function uploadPuzzles() {
	console.log("Initializing Firebase...");
	const app = initializeApp(firebaseConfig);
	const db = getFirestore(app);

	// Always connect to emulator for this script as requested
	connectFirestoreEmulator(db, "127.0.0.1", 8080);
	console.log("Connected to Firestore Emulator");

	const files = (await readdir(DATA_DIR)).filter(
		(f) => f.endsWith(".json") && f !== "unsolvables.json"
	);

	for (const file of files) {
		const difficulty = file.replace(".json", "");
		console.log(`Processing ${file} (${difficulty})...`);
		const content = await readFile(join(DATA_DIR, file), "utf-8");
		const puzzles = JSON.parse(content) as Record<
			string,
			PuzzleData
		>;
		const entries = Object.entries(puzzles);
		
		console.log(`Uploading ${entries.length} puzzles for ${difficulty}...`);
		
		for (let i = 0; i < entries.length; i += BATCH_SIZE) {
			const batch = writeBatch(db);
			const chunk = entries.slice(i, i + BATCH_SIZE);
			
			for (const [id, data] of chunk) {
				const puzzleRef = doc(db, COLLECTION_NAME, id);
				batch.set(puzzleRef, {
					puzzle: data.puzzle,
					solution: data.solution,
					difficulty: difficulty,
					score: data.score,
					techniques: data.techniques,
					updatedAt: new Date(),
				});
			}
			
			await batch.commit();
			console.log(`  Uploaded ${Math.min(i + BATCH_SIZE, entries.length)}/${entries.length}...`);
		}
		console.log(`Done with ${difficulty}`);
	}

	console.log("All puzzles uploaded successfully!");
}

uploadPuzzles().catch(console.error);
