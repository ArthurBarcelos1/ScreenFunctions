
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyBEv5JUV4fvo_pssZKtG6AuBoKBXkkafeM",
    authDomain: "click-detector.firebaseapp.com",
    databaseURL: "https://click-detector-default-rtdb.firebaseio.com",
    projectId: "click-detector",
    storageBucket: "click-detector.firebasestorage.app",
    messagingSenderId: "654129400830",
    appId: "1:6554fce0fb4bdec24eceaf",
    measurementId: "G-K4CV1RW39L"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
