// DreamFM Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAxXvJt6m-IK2G_EstbvYQZBj5wMBaqFeM",
  authDomain: "dreamfm-a6694.firebaseapp.com",
  projectId: "dreamfm-a6694",
  storageBucket: "dreamfm-a6694.firebasestorage.app",
  messagingSenderId: "634304814330",
  appId: "1:634304814330:web:e4fd0cd5e36276c37d3d43",
  measurementId: "G-EDGXSEEMHL"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Cloudflare Worker URL (your existing worker)
const WORKER_URL = 'https://gentle-union-d9c6.singhvikas21571.workers.dev';

console.log("🎧 DreamFM Firebase Initialized!");
