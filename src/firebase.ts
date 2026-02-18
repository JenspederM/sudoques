import { getAnalytics } from "firebase/analytics";
import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import {
	connectFirestoreEmulator,
	initializeFirestore,
	persistentLocalCache,
	persistentMultipleTabManager,
} from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
	apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
	authDomain: "sudoques.firebaseapp.com",
	projectId: "sudoques",
	storageBucket: "sudoques.firebasestorage.app",
	messagingSenderId: "93891219633",
	appId: "1:93891219633:web:c4983a874faf7ea4695290",
	measurementId: "G-8Y42TPY9P6",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
	localCache: persistentLocalCache({
		tabManager: persistentMultipleTabManager(),
	}),
});
export const auth = getAuth(app);

if (import.meta.env.DEV) {
	connectFirestoreEmulator(db, "127.0.0.1", 8080);
	connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
}

export const analytics =
	typeof window !== "undefined" ? getAnalytics(app) : null;
