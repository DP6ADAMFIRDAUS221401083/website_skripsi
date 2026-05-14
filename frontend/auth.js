/**
 * FrameCast — auth.js
 * Authentication module menggunakan Firebase Authentication
 *
 * Menggunakan Firebase Authentication untuk:
 * - Sign in dengan email/password
 * - Mengelola session user
 * - Logout user
 */

// ============================================================
// FIREBASE CONFIGURATION & INITIALIZATION
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBG7UnRP0c0jG-zMtWVf6_1Mdza8VNz0ZE",
  authDomain: "mobile-skripsi.firebaseapp.com",
  projectId: "mobile-skripsi",
  storageBucket: "mobile-skripsi.firebasestorage.app",
  messagingSenderId: "735101162067",
  appId: "1:735101162067:web:f602328a1db693bae5eca6",
  measurementId: "G-XCFF3XWN4G",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const SESSION_KEY = "framecast_session"; // Key untuk localStorage
const SESSION_DURATION = null; // null = berlaku sampai logout

// ============================================================
// AUTENTIKASI DENGAN FIREBASE
// ============================================================

/**
 * Login dengan Firebase Authentication
 *
 * @param {string} email - Email user
 * @param {string} password - Password user
 * @returns {Promise<Object>} - User object jika berhasil
 * @throws {Error} - Firebase error jika gagal
 */
async function loginWithFirebase(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password,
    );
    const user = userCredential.user;

    // Simpan session ke localStorage
    saveSession({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
    });

    return user;
  } catch (error) {
    throw new Error(getFirebaseErrorMessage(error));
  }
}

/**
 * Convert Firebase error ke pesan yang user-friendly
 *
 * @param {Error} error - Firebase error object
 * @returns {string} - Pesan error yang user-friendly
 */
function getFirebaseErrorMessage(error) {
  const errorCode = error.code;

  const errorMessages = {
    "auth/invalid-email": "Format email tidak valid",
    "auth/user-disabled": "User telah dinonaktifkan",
    "auth/user-not-found": "Email atau password salah",
    "auth/wrong-password": "Email atau password salah",
    "auth/invalid-credential": "Email atau password salah",
    "auth/too-many-requests":
      "Terlalu banyak percobaan login gagal. Coba lagi nanti",
    "auth/operation-not-allowed": "Operasi login tidak diizinkan",
    "auth/network-request-failed": "Koneksi internet gagal",
  };

  return errorMessages[errorCode] || `Error: ${error.message}`;
}

/**
 * Simpan session user ke localStorage
 *
 * @param {Object} userData - Data user dari Firebase
 */
function saveSession(userData) {
  const sessionData = {
    uid: userData.uid,
    email: userData.email,
    displayName: userData.displayName,
    loginTime: new Date().toISOString(),
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
}

/**
 * Ambil session dari localStorage
 *
 * @returns {Object|null} - Session data jika ada, null jika tidak
 */
function getSession() {
  const sessionStr = localStorage.getItem(SESSION_KEY);
  if (!sessionStr) return null;

  try {
    const session = JSON.parse(sessionStr);
    return session;
  } catch (e) {
    console.error("Error parsing session:", e);
    return null;
  }
}

/**
 * Cek apakah user sudah login
 *
 * @returns {boolean} - true jika user login, false jika tidak
 */
function isLoggedIn() {
  // Check Firebase auth state ATAU localStorage session
  const hasAuthState = auth.currentUser !== null;
  const hasSessionData = getSession() !== null;
  return hasAuthState || hasSessionData;
}

/**
 * Logout: sign out dari Firebase dan hapus session
 *
 * @returns {Promise<void>}
 */
async function logout() {
  try {
    await signOut(auth);
    localStorage.removeItem(SESSION_KEY);
  } catch (error) {
    console.error("Error logging out:", error);
  }
}

/**
 * Monitor auth state changes
 *
 * @param {Function} callback - Callback function ketika auth state berubah
 */
function onAuthChange(callback) {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      saveSession({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
      });
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
    callback(user);
  });
}

/**
 * Redirect ke halaman login jika belum login
 * Menggunakan onAuthStateChanged untuk wait sampai Firebase initialize
 */
function checkAuthAndRedirect() {
  // Wait untuk Firebase selesai check auth state
  onAuthStateChanged(auth, (user) => {
    if (user) {
      // User sudah login - simpan session dan lanjut
      saveSession({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
      });
    } else if (!getSession()) {
      // User belum login dan tidak ada session - redirect ke login
      window.location.href = "login.html";
    }
  });
}
}

// Export untuk digunakan di file lain
export {
  loginWithFirebase,
  logout,
  isLoggedIn,
  getSession,
  checkAuthAndRedirect,
  onAuthChange,
};
