/**
 * FrameCast — auth.js
 * Authentication module dengan hardcoded credentials (untuk testing sementara)
 *
 * Struktur ini dirancang agar mudah diupgrade ke Firebase Authentication:
 * - Ganti logika validateCredentials() dengan Firebase signInWithEmailAndPassword()
 * - Ganti saveSession() dengan Firebase user data
 * - Ganti getSession() dengan Firebase auth state listener
 */

// ============================================================
// HARDCODED CREDENTIALS (untuk testing sementara)
// MUDAH DIUPGRADE KE FIREBASE: Ganti dengan firebase.auth() API
// ============================================================
const VALID_CREDENTIALS = {
  username: "admin",
  password: "admin",
};

const SESSION_KEY = "framecast_session"; // Key untuk localStorage
const SESSION_DURATION = null; // null = berlaku sampai logout (bisa diubah ke ms)

// ============================================================
// AUTENTIKASI
// ============================================================

/**
 * Validasi kredensial pengguna (hardcoded untuk sekarang)
 *
 * UPGRADE FIREBASE:
 * - Replace dengan firebase.auth().signInWithEmailAndPassword(username, password)
 * - Handle error dari Firebase
 *
 * @param {string} username - Username yang diinput
 * @param {string} password - Password yang diinput
 * @returns {boolean} - true jika kredensial valid
 */
function validateCredentials(username, password) {
  return (
    username === VALID_CREDENTIALS.username &&
    password === VALID_CREDENTIALS.password
  );
}

/**
 * Login user: validasi dan simpan session
 *
 * UPGRADE FIREBASE:
 * - Ganti validateCredentials() dengan firebase.auth().signInWithEmailAndPassword()
 * - Firebase otomatis mengelola session
 *
 * @param {string} username - Username dari form
 * @param {string} password - Password dari form
 * @returns {{success: boolean, message: string}} - Result object
 */
function login(username, password) {
  // Validasi input
  if (!username || !password) {
    return {
      success: false,
      message: "Username dan password harus diisi",
    };
  }

  // Validasi kredensial
  if (!validateCredentials(username, password)) {
    return {
      success: false,
      message: "Username atau password salah",
    };
  }

  // Simpan session ke localStorage
  saveSession(username);

  return {
    success: true,
    message: "Login berhasil",
  };
}

/**
 * Simpan session ke localStorage
 *
 * UPGRADE FIREBASE:
 * - Firebase mengelola session secara otomatis
 * - Tidak perlu manual save di localStorage
 *
 * @param {string} username - Username yang login
 */
function saveSession(username) {
  const sessionData = {
    username: username,
    loginTime: new Date().toISOString(),
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
}

/**
 * Ambil session dari localStorage
 *
 * UPGRADE FIREBASE:
 * - Ganti dengan firebase.auth().currentUser
 * - Atau gunakan onAuthStateChanged untuk real-time listening
 *
 * @returns {Object|null} - Session data jika ada, null jika tidak
 */
function getSession() {
  const sessionStr = localStorage.getItem(SESSION_KEY);
  if (!sessionStr) return null;

  try {
    const session = JSON.parse(sessionStr);
    // Validasi session masih berlaku (jika ada durasi)
    if (SESSION_DURATION) {
      const loginTime = new Date(session.loginTime);
      const now = new Date();
      if (now - loginTime > SESSION_DURATION) {
        logout(); // Session expired
        return null;
      }
    }
    return session;
  } catch (e) {
    console.error("Error parsing session:", e);
    return null;
  }
}

/**
 * Cek apakah user sudah login
 *
 * UPGRADE FIREBASE:
 * - Ganti dengan firebase.auth().currentUser !== null
 *
 * @returns {boolean} - true jika user login, false jika tidak
 */
function isLoggedIn() {
  return getSession() !== null;
}

/**
 * Logout: hapus session dari localStorage
 *
 * UPGRADE FIREBASE:
 * - Ganti dengan firebase.auth().signOut()
 *
 * @returns {{success: boolean, message: string}} - Result object
 */
function logout() {
  localStorage.removeItem(SESSION_KEY);
  return {
    success: true,
    message: "Logout berhasil",
  };
}

/**
 * Redirect ke halaman login jika belum login
 * Gunakan di script.js pada page load
 */
function checkAuthAndRedirect() {
  if (!isLoggedIn()) {
    window.location.href = "login.html";
  }
}

// Export untuk digunakan di file lain
// (Atau bisa langsung akses global karena <script> tag)
