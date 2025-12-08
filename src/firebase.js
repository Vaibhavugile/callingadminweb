// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
// Replace with your project's config (from Firebase console -> Project settings -> SDK)
const firebaseConfig = {
  apiKey: "AIzaSyC1Beie4s7cuUa_GAsVQX_YdDx0q6qjrj8",
  authDomain: "calling-a6e56.firebaseapp.com",
  projectId: "calling-a6e56",
  storageBucket: "calling-a6e56.firebasestorage.app",
  messagingSenderId: "308303504367",
  appId: "1:308303504367:web:b35311ee8f23bd9ba20c1a",
  measurementId: "G-VGFVH0SVLC"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);