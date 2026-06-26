/**
 * FrameCast — script.js
 * Real-time AI Security System
 *
 * - Webcam streaming
 * - YOLO person detection
 * - MediaPipe pose extraction
 * - CNN prediction via Hugging Face API
 * - Firebase authentication
 */

// ============================================================
// IMPORTS
// ============================================================
import { checkAuthAndRedirect, logout } from "./services/auth.js";
import { API_CONFIG } from "./config.js";
import {
  initCamera,
  stopCamera as stopCameraModule,
  captureFrame,
  isStreaming,
} from "./modules/camera.js";
import { loadYoloModel, detectPersons, cropPerson } from "./modules/yolo.js";
import { initializePoseLandmarker, extractPose } from "./modules/mediapipe.js";
import { sendPrediction } from "./services/predict.js";
import { recognizeFace } from "./services/face.js";
import {
  validateFeatures,
  updateStatus,
  displayPredictionResult,
} from "./modules/utils.js";

// ============================================================
// 0. AUTH CHECK - Pastikan user sudah login
// ============================================================
window.addEventListener("DOMContentLoaded", () => {
  // Check auth sebelum menjalankan aplikasi utama
  checkAuthAndRedirect();
});

// ============================================================
// STATE
// ============================================================
const state = {
  predictionTimer: null,
  modelsLoaded: false,
  frameCount: 0,
  statSent: 0,
  statFailed: 0,
};

/**
 * Initialize AI models (async, di-load sekali saja)
 */
async function initializeAIModels() {
  if (state.modelsLoaded) return true;

  try {
    log("Loading AI models...", "info");
    updateStatus("Loading...");

    log("Loading YOLO model...", "info");
    await loadYoloModel();

    log("Initializing MediaPipe...", "info");
    await initializePoseLandmarker();

    state.modelsLoaded = true;
    log("AI models loaded successfully", "success");
    return true;
  } catch (error) {
    log(`Failed to load AI models: ${error.message}`, "error");
    updateStatus("Failed");
    return false;
  }
}

// ============================================================
// 2. REFERENSI DOM
// ============================================================
const video = document.getElementById("videoFeed");
const canvas = document.getElementById("captureCanvas");
const ctx = canvas.getContext("2d");

const btnStart = document.getElementById("btnStart");
const btnStop = document.getElementById("btnStop");
const btnLogout = document.getElementById("btnLogout");

const intervalInput = document.getElementById("captureInterval");
const intervalDisp = document.getElementById("intervalDisplay");

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
 * Start camera and AI pipeline
 */
async function startCamera() {
  try {
    log("Starting AI Pipeline (YOLO + MediaPipe + CNN)...", "info");
    updateStatus("Loading...");

    // Initialize AI models
    const modelsReady = await initializeAIModels();
    if (!modelsReady) {
      log("Failed to initialize AI models", "error");
      setStatus("error");
      return;
    }

    // Start camera
    log("Starting camera...", "info");
    await initCamera();

    // Update UI
    idleOverlay.classList.add("hidden");
    videoWrapper.classList.add("scanning");
    recBadge.classList.add("visible");
    btnStart.disabled = true;
    btnStop.disabled = false;
    setStatus("active");
    log("Camera started", "success");

    // Start prediction loop
    startPredictionLoop();
  } catch (err) {
    handleCameraError(err);
  }
}

/**
 * Prediction Loop
 */
function startPredictionLoop() {
  if (state.predictionTimer) {
    clearInterval(state.predictionTimer);
  }

  const intervalMs = parseInt(intervalInput.value, 10);
  state.predictionTimer = setInterval(async () => {
    if (isStreaming()) {
      await runPredictionPipeline();
    }
  }, intervalMs);

  log(`Prediction loop started — interval: ${intervalMs}ms`, "info");
}

/**
 * Stop Prediction Loop
 */
function stopPredictionLoop() {
  if (state.predictionTimer) {
    clearInterval(state.predictionTimer);
    state.predictionTimer = null;
  }
}

/**
 * Run Prediction Pipeline
 */
async function runPredictionPipeline() {
  try {
    // Get current frame
    const frame = captureFrame(640, 480);
    state.frameCount++;
    frameCountEl.textContent = state.frameCount;

    // 1. Face Recognition (Backend)
    updateStatus("Recognizing Face...");
    const faceResult = await recognizeFace(frame);

    // 2. YOLO Detection
    updateStatus("YOLO Detecting...");
    const { bestPerson } = await detectPersons(frame);

    if (!bestPerson) {
      console.log("No person detected");
      updateStatus("No Person");
      return;
    }

    // 2. Crop person
    const croppedCanvas = cropPerson(frame, bestPerson.bbox);

    // 3. MediaPipe Pose Extraction
    updateStatus("Pose Extracting...");
    const poseResult = await extractPose(croppedCanvas);

    if (!poseResult.success) {
      console.log("Pose extraction failed:", poseResult.error);
      updateStatus("Pose Failed");
      return;
    }

    const features = poseResult.features;

    // 4. Validate features
    if (!validateFeatures(features)) {
      console.error("Features validation failed");
      updateStatus("Validation Failed");
      return;
    }

    log(`Features extracted: ${features.length} values`, "info");

    // 5. Send to CNN API (Hugging Face)
    updateStatus("Sending Prediction...");
    triggerFlash();

    const predictionResult = await sendPrediction(features);

    if (predictionResult.success) {
      state.statSent++;
      statSentEl.textContent = state.statSent;

      // Fusion Logic
      let fusionString = "";
      if (faceResult.status === "known" && predictionResult.prediction === "aman") {
        fusionString = `${faceResult.identity} - Aman`;
      } else if (faceResult.status === "known" && predictionResult.prediction === "berbahaya") {
        fusionString = `${faceResult.identity} - Aktivitas Berbahaya`;
      } else if (faceResult.status === "unknown" && predictionResult.prediction === "aman") {
        fusionString = "Orang Tidak Dikenal";
      } else if (faceResult.status === "unknown" && predictionResult.prediction === "berbahaya") {
        fusionString = "ALERT: Orang Tidak Dikenal Melakukan Aktivitas Berbahaya";
      } else {
        fusionString = `${faceResult.identity} - ${predictionResult.prediction}`;
      }

      const payload = {
        identity: faceResult.identity,
        activity: predictionResult.prediction === "berbahaya" ? "Berbahaya" : "Aman",
        confidence: predictionResult.confidence,
        timestamp: new Date().toISOString()
      };

      log(
        `✓ Fusion: ${fusionString} (Conf: ${(predictionResult.confidence * 100).toFixed(1)}%)`,
        "success",
      );
      console.log("Notification Payload:", JSON.stringify(payload));

      updateStatus("Prediction Success");
      displayPredictionResult(predictionResult);
    } else {
      state.statFailed++;
      statFailedEl.textContent = state.statFailed;

      log(`✗ Prediction failed: ${predictionResult.error}`, "error");
      updateStatus("Prediction Failed");
    }
  } catch (error) {
    console.error("Pipeline error:", error);
    log(`Pipeline error: ${error.message}`, "error");
    updateStatus("Error");
  }
}

/**
 * Stop camera and cleanup
 */
function stopCamera() {
  log("Stopping AI Pipeline...", "info");
  stopPredictionLoop();
  stopCameraModule();

  video.srcObject = null;
  state.frameCount = 0;
  frameCountEl.textContent = "0";

  // Update UI
  idleOverlay.classList.remove("hidden");
  videoWrapper.classList.remove("scanning");
  recBadge.classList.remove("visible");
  btnStart.disabled = false;
  btnStop.disabled = true;
  setStatus("offline");
  log("Camera stopped", "info");
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

/**
 * Flash animation on video wrapper
 */
function triggerFlash() {
  videoWrapper.classList.remove("flash");
  void videoWrapper.offsetWidth;
  videoWrapper.classList.add("flash");
}

// ============================================================
// EVENT LISTENERS
// ============================================================

btnStart.addEventListener("click", startCamera);
btnStop.addEventListener("click", stopCamera);

// Update interval display when changed
intervalInput.addEventListener("input", () => {
  intervalDisp.textContent = `${intervalInput.value} ms`;
});

// Update quality display when changed
qualityInput.addEventListener("input", () => {
  qualityDisp.textContent = qualityInput.value;
});

// Stop stream if page is closed
window.addEventListener("beforeunload", () => {
  if (state.predictionTimer) {
    stopCamera();
  }
});

// ============================================================
// INITIALIZATION
// ============================================================
(function init() {
  setStatus("offline");
  log(
    'FrameCast AI Security System ready. Press "Start Camera" to begin.',
    "info",
  );

  if (!navigator.mediaDevices?.getUserMedia) {
    log("Browser does not support camera access (getUserMedia).", "error");
    btnStart.disabled = true;
    setStatus("error");
  }
})();
