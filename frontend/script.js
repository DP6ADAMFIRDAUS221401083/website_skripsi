/**
 * FrameCast — script.js
 * Webcam capture device: ambil frame dari webcam, kirim ke backend API.
 * Dengan sistem autentikasi terintegrasi menggunakan Firebase.
 */

// ============================================================
// IMPORT FIREBASE AUTH
// ============================================================
import { checkAuthAndRedirect, logout } from "./auth.js";

// ============================================================
// 0. AUTH CHECK - Pastikan user sudah login
// ============================================================
window.addEventListener("DOMContentLoaded", () => {
  // Check auth sebelum menjalankan aplikasi utama
  checkAuthAndRedirect();
});

// ============================================================
// 1. STATE APLIKASI
// ============================================================
const state = {
  stream: null, // MediaStream aktif
  captureTimer: null, // setInterval handle
  isCapturing: false,
  frameCount: 0,
  statSent: 0,
  statFailed: 0,
};

// ============================================================
// 2. REFERENSI DOM
// ============================================================
const video = document.getElementById("videoFeed");
const canvas = document.getElementById("captureCanvas");
const ctx = canvas.getContext("2d");

const btnStart = document.getElementById("btnStart");
const btnStop = document.getElementById("btnStop");
const btnLogout = document.getElementById("btnLogout");

const endpointInput = document.getElementById("endpointUrl");
const intervalInput = document.getElementById("captureInterval");
const intervalDisp = document.getElementById("intervalDisplay");
const sizeSelect = document.getElementById("captureSize");
const qualityInput = document.getElementById("jpegQuality");
const qualityDisp = document.getElementById("qualityDisplay");

const statusInd = document.getElementById("statusIndicator");
const statusLabel = document.getElementById("statusLabel");
const recBadge = document.getElementById("recBadge");
const idleOverlay = document.getElementById("idleOverlay");
const videoWrapper = document.querySelector(".video-wrapper");
const frameCountEl = document.getElementById("frameCount");

const statSentEl = document.getElementById("statSent");
const statFailedEl = document.getElementById("statFailed");
const statSizeEl = document.getElementById("statSize");
const statLatEl = document.getElementById("statLatency");

const logOutput = document.getElementById("logOutput");
const logClear = document.getElementById("logClear");

// ============================================================
// 2.5 AUTH HANDLERS
// ============================================================

/**
 * Handle logout button click
 */
btnLogout.addEventListener("click", () => {
  if (confirm("Yakin mau logout?")) {
    // Stop kamera terlebih dahulu
    if (state.isCapturing) {
      stopCamera();
    }

    // Logout dan redirect ke login page
    logout();
    window.location.href = "login.html";
  }
});

// ============================================================
// 3. LOGGING UTILITY
// ============================================================
/**
 * Tambahkan baris log ke panel log.
 * @param {string} msg  - Pesan log
 * @param {'info'|'success'|'error'} type - Tipe warna log
 */
function log(msg, type = "info") {
  const now = new Date().toLocaleTimeString("id-ID", { hour12: false });
  const line = document.createElement("span");
  line.className = `log-line ${type}`;
  line.textContent = `[${now}] ${msg}`;
  logOutput.appendChild(line);
  logOutput.scrollTop = logOutput.scrollHeight; // auto-scroll ke bawah
}

logClear.addEventListener("click", () => {
  logOutput.innerHTML = "";
});

// ============================================================
// 4. STATUS UI
// ============================================================
function setStatus(mode) {
  // mode: 'offline' | 'active' | 'error'
  statusInd.className = `status-indicator ${mode === "offline" ? "" : mode}`;
  statusLabel.textContent =
    {
      offline: "OFFLINE",
      active: "STREAMING",
      error: "ERROR",
    }[mode] ?? "OFFLINE";
}

// ============================================================
// 5. KONTROL KAMERA
// ============================================================

/**
 * Mulai stream webcam.
 * Menggunakan navigator.mediaDevices.getUserMedia untuk akses kamera.
 */
async function startCamera() {
  try {
    log("Meminta akses kamera…", "info");

    // Minta akses webcam — resolusi ideal HD
    state.stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: "environment",
      },
      audio: false,
    });

    video.srcObject = state.stream;
    await video.play();

    // Update UI
    idleOverlay.classList.add("hidden");
    videoWrapper.classList.add("scanning");
    recBadge.classList.add("visible");
    btnStart.disabled = true;
    btnStop.disabled = false;
    setStatus("active");
    log("Kamera aktif", "success");

    // Mulai capture loop
    startCaptureLoop();
  } catch (err) {
    handleCameraError(err);
  }
}

/**
 * Hentikan stream dan bersihkan semua resource.
 */
function stopCamera() {
  stopCaptureLoop();

  if (state.stream) {
    state.stream.getTracks().forEach((track) => track.stop());
    state.stream = null;
  }

  video.srcObject = null;
  state.isCapturing = false;
  state.frameCount = 0;
  frameCountEl.textContent = "0";

  // Update UI
  idleOverlay.classList.remove("hidden");
  videoWrapper.classList.remove("scanning");
  recBadge.classList.remove("visible");
  btnStart.disabled = false;
  btnStop.disabled = true;
  setStatus("offline");
  log("Kamera dihentikan", "info");
}

/**
 * Tangani error akses kamera.
 */
function handleCameraError(err) {
  let msg = "Gagal mengakses kamera";

  if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
    msg = "Izin kamera ditolak. Silakan izinkan akses kamera di browser Anda.";
  } else if (
    err.name === "NotFoundError" ||
    err.name === "DevicesNotFoundError"
  ) {
    msg = "Tidak ada kamera yang terdeteksi di perangkat ini.";
  } else if (err.name === "NotReadableError") {
    msg = "Kamera sedang digunakan aplikasi lain.";
  }

  log(msg, "error");
  setStatus("error");
  statusInd.classList.add("error");
}

// ============================================================
// 6. CAPTURE LOOP
// ============================================================

/**
 * Mulai interval capture dan pengiriman frame.
 */
function startCaptureLoop() {
  if (state.captureTimer) return; // Hindari duplikasi timer
  state.isCapturing = true;

  const intervalMs = parseInt(intervalInput.value, 10);
  state.captureTimer = setInterval(captureAndSend, intervalMs);
  log(`Capture loop dimulai — interval: ${intervalMs}ms`, "info");
}

/**
 * Hentikan interval capture.
 */
function stopCaptureLoop() {
  if (state.captureTimer) {
    clearInterval(state.captureTimer);
    state.captureTimer = null;
  }
  state.isCapturing = false;
}

/**
 * Ambil satu frame dari video, resize, lalu kirim ke backend.
 */
async function captureAndSend() {
  // Pastikan video sudah siap dan stream aktif
  if (!state.stream || video.readyState < 2) return;

  // Baca konfigurasi resolusi dari dropdown
  const [w, h] = sizeSelect.value.split("x").map(Number);
  canvas.width = w;
  canvas.height = h;

  // Gambar frame video ke canvas (ini yang meresize gambar)
  ctx.drawImage(video, 0, 0, w, h);

  // Konversi canvas ke JPEG blob
  const quality = parseFloat(qualityInput.value);
  const blob = await canvasToBlob(canvas, "image/jpeg", quality);

  if (!blob) {
    log("Gagal mengkonversi frame ke blob", "error");
    return;
  }

  // Update frame counter
  state.frameCount++;
  frameCountEl.textContent = state.frameCount;

  // Flash efek pada video wrapper untuk feedback visual
  triggerFlash();

  // Kirim ke backend
  await sendFrame(blob);
}

/**
 * Promise wrapper untuk canvas.toBlob.
 */
function canvasToBlob(c, type, quality) {
  return new Promise((resolve) => c.toBlob(resolve, type, quality));
}

/**
 * Flash animasi di video wrapper saat frame terkirim.
 */
function triggerFlash() {
  videoWrapper.classList.remove("flash");
  // Force reflow agar animasi bisa di-restart
  void videoWrapper.offsetWidth;
  videoWrapper.classList.add("flash");
}

// ============================================================
// 7. PENGIRIMAN DATA KE BACKEND
// ============================================================

/**
 * Kirim blob (JPEG frame) ke endpoint backend via HTTP POST.
 * @param {Blob} blob - Frame gambar JPEG
 */
async function sendFrame(blob) {
  const endpoint = endpointInput.value.trim();
  if (!endpoint) {
    log("Endpoint kosong! Isi URL backend terlebih dahulu.", "error");
    return;
  }

  const startTime = performance.now();

  try {
    /**
     * Opsi pengiriman: multipart/form-data (direkomendasikan untuk blob/file).
     * Backend bisa membaca field "frame" sebagai file upload.
     * Alternatif: kirim sebagai raw binary dengan Content-Type: image/jpeg
     */
    const formData = new FormData();
    formData.append("frame", blob, `frame_${state.frameCount}.jpg`);

    const response = await fetch(endpoint, {
      method: "POST",
      body: formData,
      // Catatan: Jangan set Content-Type secara manual untuk FormData;
      // browser akan otomatis set boundary yang benar.
    });

    const latencyMs = Math.round(performance.now() - startTime);

    if (response.ok) {
      state.statSent++;
      statSentEl.textContent = state.statSent;
      statSizeEl.textContent = formatBytes(blob.size);
      statLatEl.textContent = `${latencyMs}ms`;
      log(
        `✓ Frame #${state.frameCount} terkirim — ${formatBytes(blob.size)} — ${latencyMs}ms`,
        "success",
      );
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (err) {
    state.statFailed++;
    statFailedEl.textContent = state.statFailed;
    log(`✗ Gagal kirim frame #${state.frameCount}: ${err.message}`, "error");

    // Setelah 5 kegagalan berturut-turut, tampilkan status error
    if (state.statFailed > 0 && state.statFailed % 5 === 0) {
      setStatus("error");
    }
  }
}

// ============================================================
// 8. UTILITAS
// ============================================================

/**
 * Format ukuran byte ke string yang mudah dibaca.
 * @param {number} bytes
 * @returns {string}
 */
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ============================================================
// 9. EVENT LISTENERS
// ============================================================

btnStart.addEventListener("click", startCamera);
btnStop.addEventListener("click", stopCamera);

// Restart capture loop jika interval diubah saat sedang berjalan
intervalInput.addEventListener("input", () => {
  intervalDisp.textContent = `${intervalInput.value} ms`;

  if (state.isCapturing) {
    stopCaptureLoop();
    startCaptureLoop();
    log(`Interval diubah ke ${intervalInput.value}ms`, "info");
  }
});

qualityInput.addEventListener("input", () => {
  qualityDisp.textContent = parseFloat(qualityInput.value).toFixed(1);
});

// Hentikan stream jika halaman ditutup
window.addEventListener("beforeunload", () => {
  if (state.stream) stopCamera();
});

// ============================================================
// 10. INISIALISASI
// ============================================================
(function init() {
  setStatus("offline");
  log('FrameCast siap. Tekan "Start Camera" untuk memulai.', "info");

  // Periksa dukungan getUserMedia
  if (!navigator.mediaDevices?.getUserMedia) {
    log("Browser ini tidak mendukung akses kamera (getUserMedia).", "error");
    btnStart.disabled = true;
    setStatus("error");
  }
})();
