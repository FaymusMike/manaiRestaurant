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
firebase.initializeApp(firebaseConfig);

// Initialize Firebase services
const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();

// Enable offline persistence (optional but recommended)
db.enablePersistence()
  .catch((err) => {
    if (err.code == 'failed-precondition') {
      console.log("Persistence failed: Multiple tabs open");
    } else if (err.code == 'unimplemented') {
      console.log("Persistence not available");
    }
  });

  // Sign in
auth.signInWithEmailAndPassword(email, password)
  .then((userCredential) => {
    const user = userCredential.user;
  })
  .catch((error) => {
    console.error("Error signing in:", error);
  });

// Sign out
auth.signOut().then(() => {
  console.log("User signed out");
});

// Add a document
db.collection("menu").add({
  name: "Jollof Rice",
  category: "main",
  price: 1500,
  description: "Delicious Nigerian jollof rice"
})
.then((docRef) => {
  console.log("Document written with ID: ", docRef.id);
})
.catch((error) => {
  console.error("Error adding document: ", error);
});

// Read documents
db.collection("menu").get().then((querySnapshot) => {
  querySnapshot.forEach((doc) => {
    console.log(doc.id, " => ", doc.data());
  });
});

// Real-time updates
db.collection("menu").onSnapshot((querySnapshot) => {
  const items = [];
  querySnapshot.forEach((doc) => {
    items.push({ id: doc.id, ...doc.data() });
  });
  console.log("Current menu items: ", items);
});