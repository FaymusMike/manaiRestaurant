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

// Global variables to track Firebase initialization state
window.firebaseInitialized = false;
window.firebaseError = null;

// Initialize Firebase with comprehensive error handling
try {
  // Check if Firebase is already initialized
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase initialized successfully");
    window.firebaseInitialized = true;
    
    // Initialize Firebase services
    initializeFirebaseServices();
  } else {
    // Firebase already initialized, use the existing app
    firebase.app();
    console.log("Firebase already initialized, using existing instance");
    window.firebaseInitialized = true;
    initializeFirebaseServices();
  }
} catch (error) {
  console.error("Firebase initialization error:", error);
  window.firebaseError = error;
  handleFirebaseError(error);
}

// Initialize Firebase services with proper error handling
function initializeFirebaseServices() {
  try {
    // Initialize Firestore
    window.db = firebase.firestore();
    
    // Initialize Auth (if needed)
    window.auth = firebase.auth();
    
    console.log("Firebase services initialized successfully");
    
    // Enable offline persistence for Firestore
    enableOfflinePersistence();
    
  } catch (error) {
    console.error("Firebase services initialization error:", error);
    window.firebaseError = error;
    handleFirebaseError(error);
  }
}

// Enable offline persistence with error handling
function enableOfflinePersistence() {
  if (window.db && window.db.enablePersistence) {
    window.db.enablePersistence()
      .then(() => {
        console.log("Firestore offline persistence enabled");
      })
      .catch((err) => {
        console.warn("Firestore offline persistence failed:", err);
        // This is not a critical error, so we don't need to show a user message
        if (err.code === 'failed-precondition') {
          console.log("Persistence failed: Multiple tabs open");
        } else if (err.code === 'unimplemented') {
          console.log("Persistence not available in this browser");
        }
      });
  }
}

// Global error handling function
function handleFirebaseError(error) {
  console.error("Firebase Error:", error);
  
  // Show user-friendly error message
  showFirebaseErrorToUser(error);
}

// Show user-friendly error message
function showFirebaseErrorToUser(error) {
  // Create error container if it doesn't exist
  let errorContainer = document.getElementById('firebase-error-container');
  if (!errorContainer) {
    errorContainer = document.createElement('div');
    errorContainer.id = 'firebase-error-container';
    errorContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      max-width: 400px;
      background: #dc3545;
      color: white;
      padding: 15px;
      border-radius: 5px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      font-family: Arial, sans-serif;
    `;
    document.body.appendChild(errorContainer);
  }
  
  let errorMessage = 'Connection error. Please check your internet connection.';
  
  // Provide more specific error messages based on error code
  if (error.code) {
    switch (error.code) {
      case 'failed-precondition':
        errorMessage = 'Database error. Please refresh the page.';
        break;
      case 'permission-denied':
        errorMessage = 'Access denied. Please contact support or check Firebase rules.';
        break;
      case 'unavailable':
        errorMessage = 'Network unavailable. Please check your connection.';
        break;
      default:
        errorMessage = `Error: ${error.message || 'Unknown error occurred'}`;
    }
  }
  
  errorContainer.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
      <div style="flex: 1;">
        <strong style="display: block; margin-bottom: 5px;">⚠️ Connection Issue</strong>
        <div style="font-size: 14px; line-height: 1.4;">${errorMessage}</div>
        <div style="font-size: 12px; margin-top: 8px; opacity: 0.8;">
          Some features may not work properly.
        </div>
      </div>
      <button onclick="this.parentElement.parentElement.style.display='none'" 
              style="background: none; border: none; color: white; cursor: pointer; margin-left: 10px; font-size: 18px;">
        ×
      </button>
    </div>
  `;
  
  // Auto-hide after 10 seconds
  setTimeout(() => {
    if (errorContainer) {
      errorContainer.style.display = 'none';
    }
  }, 10000);
}

// Utility function to check if Firebase is ready
window.isFirebaseReady = function() {
  return window.firebaseInitialized && window.db;
};

// Utility function to get database with fallback
window.getDatabase = function() {
  if (window.db) {
    return window.db;
  }
  
  // If Firebase failed to initialize, show error and return null
  if (window.firebaseError) {
    handleFirebaseError(window.firebaseError);
  }
  
  return null;
};

// Global function to retry Firebase initialization
window.retryFirebaseInitialization = function() {
  try {
    // Remove any existing error messages
    const errorContainer = document.getElementById('firebase-error-container');
    if (errorContainer) {
      errorContainer.remove();
    }
    
    // Try to reinitialize
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
      console.log("Firebase reinitialized successfully");
      window.firebaseInitialized = true;
      window.firebaseError = null;
      initializeFirebaseServices();
      
      // Show success message
      showSuccessMessage("Connection restored successfully!");
    }
  } catch (error) {
    console.error("Failed to reinitialize Firebase:", error);
    window.firebaseError = error;
    handleFirebaseError(error);
  }
};

// Show success message
function showSuccessMessage(message) {
  // Create success container if it doesn't exist
  let successContainer = document.getElementById('firebase-success-container');
  if (!successContainer) {
    successContainer = document.createElement('div');
    successContainer.id = 'firebase-success-container';
    successContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      max-width: 400px;
      background: #28a745;
      color: white;
      padding: 15px;
      border-radius: 5px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      font-family: Arial, sans-serif;
    `;
    document.body.appendChild(successContainer);
  }
  
  successContainer.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
      <div style="flex: 1;">
        <strong style="display: block; margin-bottom: 5px;">✅ Success</strong>
        <div style="font-size: 14px; line-height: 1.4;">${message}</div>
      </div>
      <button onclick="this.parentElement.parentElement.style.display='none'" 
              style="background: none; border: none; color: white; cursor: pointer; margin-left: 10px; font-size: 18px;">
        ×
      </button>
    </div>
  `;
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    if (successContainer) {
      successContainer.style.display = 'none';
    }
  }, 5000);
}