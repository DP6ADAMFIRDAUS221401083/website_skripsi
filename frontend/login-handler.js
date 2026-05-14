/**
 * FrameCast — login-handler.js
 * Handler untuk form login di halaman login.html
 */

// ============================================================
// REFERENSI DOM
// ============================================================
const loginForm = document.getElementById("loginForm");
const usernameInput = document.getElementById("username");
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
usernameInput.addEventListener("input", clearError);
passwordInput.addEventListener("input", clearError);

// ============================================================
// FUNGSI HANDLER
// ============================================================

/**
 * Handle login form submission
 * @param {Event} event - Form submit event
 */
async function handleLogin(event) {
  event.preventDefault();

  // Ambil nilai input
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  // Clear previous error
  clearError();

  // Disable button selama proses (simulasi loading)
  const loginButton = loginForm.querySelector(".login-button");
  loginButton.disabled = true;

  // Simulate network delay untuk UX yang lebih baik
  await new Promise((resolve) => setTimeout(resolve, 300));

  // Validasi dengan auth module
  const result = login(username, password);

  if (result.success) {
    // Login berhasil: redirect ke halaman utama
    showSuccess("Login berhasil, membuka aplikasi...");

    // Redirect setelah delay kecil untuk UX yang smooth
    setTimeout(() => {
      window.location.href = "index.html";
    }, 500);
  } else {
    // Login gagal: tampilkan error message
    showError(result.message);
    loginButton.disabled = false;

    // Clear password untuk security
    passwordInput.value = "";
    usernameInput.focus();
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
