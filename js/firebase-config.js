// Firebase configuration - Replace with your actual config
const firebaseConfig = {
  apiKey: "AIzaSyDd8YhMDGofLRg03816XJ3PGbt1u82_gOA",
  authDomain: "manai-restaurant.firebaseapp.com",
  databaseURL: "https://manai-restaurant-default-rtdb.firebaseio.com",
  projectId: "manai-restaurant",
  storageBucket: "manai-restaurant.firebasestorage.app",
  messagingSenderId: "327303164037",
  appId: "1:327303164037:web:1fe88981b58043812279ec"
};

// Initialize Firebase
try {
  firebase.initializeApp(firebaseConfig);
  console.log("Firebase initialized successfully");
} catch (error) {
  console.error("Firebase initialization error:", error);
}

// Initialize Firebase services with error handling
let db, storage;

try {
  db = firebase.firestore();
  storage = firebase.storage();
  console.log("Firebase services initialized");
} catch (error) {
  console.error("Firebase services initialization error:", error);
  // Fallback to mock data for demonstration
  db = {
    collection: () => ({
      add: () => Promise.reject("Firebase not configured"),
      get: () => Promise.reject("Firebase not configured")
    })
  };
  storage = {
    ref: () => ({
      put: () => Promise.reject("Firebase not configured")
    })
  };
}

// Enable offline persistence
if (db.enablePersistence) {
  db.enablePersistence()
    .catch((err) => {
      if (err.code == 'failed-precondition') {
        console.log("Persistence failed: Multiple tabs open");
      } else if (err.code == 'unimplemented') {
        console.log("Persistence not available");
      }
    });
}