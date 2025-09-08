// Firebase configuration - Replace with your actual config
const firebaseConfig = {
    apiKey: "AIzaSyDummyApiKeyForDevelopment",
    authDomain: "manai-restaurant.firebaseapp.com",
    projectId: "manai-restaurant",
    storageBucket: "manai-restaurant.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abc123def456"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase services
const db = firebase.firestore();
const storage = firebase.storage();