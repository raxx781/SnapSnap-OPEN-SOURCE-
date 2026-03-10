// SnapSnap Firebase Configuration
// ================================
// Replace the values below with your Firebase project config.
// Go to: https://console.firebase.google.com
//   → Your Project → Project Settings → General → Your Apps → Config

const firebaseConfig = {
    apiKey: "AIzaSyBQ0QvyhqQVIneJqbXIxuOM4UOz3vsK7E8",
    authDomain: "snapsnap-a318f.firebaseapp.com",
    projectId: "snapsnap-a318f",
    storageBucket: "snapsnap-a318f.firebasestorage.app",
    messagingSenderId: "703007743977",
    appId: "1:703007743977:web:49564aadfc808fe929f578"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();
