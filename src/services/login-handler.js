/**
 * FrameCast — login-handler.js
 * Handler untuk form login dengan Firebase Authentication
 */

// Import Firebase auth functions
import { loginWithFirebase, isLoggedIn } from "./auth.js";

// ============================================================
// REFERENSI DOM
// ============================================================
const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("username"); // Gunakan sebagai email input
const passwordInput = document.getElementById("password");
const errorMessage = document.getElementById("errorMessage");

// ============================================================
// EVENT LISTENERS
// ============================================================

/**
 * Handle form submission
 */
loginForm.addEventListener("submit", handleLogin);

/**
 * Clear error message saat user mulai typing
 */
emailInput.addEventListener("input", clearError);
passwordInput.addEventListener("input", clearError);

// ============================================================
// FUNGSI HANDLER
// ============================================================

/**
 * Handle login form submission dengan Firebase
 * @param {Event} event - Form submit event
 */
async function handleLogin(event) {
  event.preventDefault();

  // Ambil nilai input
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  // Clear previous error
  clearError();

  // Disable button selama proses
  const loginButton = loginForm.querySelector(".login-button");
  loginButton.disabled = true;
  loginButton.innerHTML =
    '<span class="login-button-icon">⏳</span><span>LOADING...</span>';

  try {
    // Firebase login
    await loginWithFirebase(email, password);

    // Login berhasil: tampilkan success message
    showSuccess("Login berhasil, membuka aplikasi...");

    // Redirect setelah delay kecil untuk UX yang smooth
    setTimeout(() => {
      window.location.href = "index.html";
    }, 500);
  } catch (error) {
    // Login gagal: tampilkan error message
    showError(error.message);
    loginButton.disabled = false;
    loginButton.innerHTML =
      '<span class="login-button-icon">▶</span><span>LOGIN</span>';

    // Clear password untuk security
    passwordInput.value = "";
    emailInput.focus();
  }
}

/**
 * Tampilkan error message
 * @param {string} message - Pesan error
 */
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.add("visible", "error");
  errorMessage.classList.remove("success");
}

/**
 * Tampilkan success message
 * @param {string} message - Pesan success
 */
function showSuccess(message) {
  errorMessage.textContent = message;
  errorMessage.classList.add("visible", "success");
  errorMessage.classList.remove("error");
}

/**
 * Clear error/success message
 */
function clearError() {
  errorMessage.textContent = "";
  errorMessage.classList.remove("visible", "error", "success");
}

// ============================================================
// CHECK SESSION ON PAGE LOAD
// ============================================================

/**
 * Jika user sudah login, redirect langsung ke index.html
 * Tidak perlu login ulang
 */
window.addEventListener("DOMContentLoaded", () => {
  if (isLoggedIn()) {
    // Redirect ke halaman utama jika sudah login
    window.location.href = "index.html";
  }
});

const password = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");

if (password && togglePassword) {
  togglePassword.addEventListener("click", () => {
    if (password.type === "password") {
      password.type = "text";
    } else {
      password.type = "password";
    }
  });
}
