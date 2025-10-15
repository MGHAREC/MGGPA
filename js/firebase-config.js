// js/firebase-config.js
// ⚠️ REMPLACER AVEC VOS VRAIES CLÉS APRÈS CRÉATION FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyDCrGtuxcYcxGLIxWQvdzgCFm7C3NwtCuM",
  authDomain: "gestion-production-e055d.firebaseapp.com",
  projectId: "gestion-production-e055d",
  storageBucket: "gestion-production-e055d.firebasestorage.app",
  messagingSenderId: "462785738791",
  appId: "1:462785738791:web:0a6a16f1ae0e24ae61f602",
  measurementId: "G-F5TCW63M3R"
};

// Initialisation Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();  // Storage activé automatiquement

console.log("✅ Firebase configuré");