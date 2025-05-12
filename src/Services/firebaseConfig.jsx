// firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB-Wjg-V9yI27ZhFMsG9kyXLL952n7Sors",
  authDomain: "newagedispatch.firebaseapp.com",
  projectId: "newagedispatch",
  storageBucket: "newagedispatch.firebasestorage.app",
  messagingSenderId: "945019686376",
  appId: "1:945019686376:web:905efd30fab0533fc7285d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the auth and firestore instances
export const auth = getAuth(app);
export const db = getFirestore(app);
