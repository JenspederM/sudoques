// Import the functions you need from the SDKs you need

import { getAnalytics } from "firebase/analytics";
import { initializeApp } from "firebase/app";
import {
	connectAuthEmulator,
	GoogleAuthProvider,
	getAuth,
} from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
	apiKey: process.env.BUN_PUBLIC_FIREBASE_API_KEY,
	authDomain: "sudoques.firebaseapp.com",
	projectId: "sudoques",
	storageBucket: "sudoques.firebasestorage.app",
	messagingSenderId: "93891219633",
	appId: "1:93891219633:web:c4983a874faf7ea4695290",
	measurementId: "G-8Y42TPY9P6",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

if (process.env.NODE_ENV !== "production") {
	connectFirestoreEmulator(db, "127.0.0.1", 8080);
	connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
}

export const analytics =
	typeof window !== "undefined" ? getAnalytics(app) : null;
