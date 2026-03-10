// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCY95z91jd_OLCc9K-2wdRr2mHxqlunxZ8",
  authDomain: "crested-drive-483712-e5.firebaseapp.com",
  databaseURL: "https://crested-drive-483712-e5-default-rtdb.firebaseio.com",
  projectId: "crested-drive-483712-e5",
  storageBucket: "crested-drive-483712-e5.firebasestorage.app",
  messagingSenderId: "604419916756",
  appId: "1:604419916756:web:e2fa42c0743e206da70c41",
  measurementId: "G-S4N8JNJTGB"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

