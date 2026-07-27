/**
 * FrameCast — utils.js
 * Utility functions untuk AI pipeline
 */

/**
 * Validasi features array
 * @param {Array} features - Array dengan 66 fitur
 * @returns {boolean} - True jika valid
 */
export function validateFeatures(features) {
  // Check length
  if (!Array.isArray(features) || features.length !== 66) {
    console.error("Features length must be 66, got:", features.length);
    return false;
  }

  // Check semua nilai
  for (let i = 0; i < features.length; i++) {
    const value = features[i];

    // Check tipe
    if (typeof value !== "number") {
      console.error(`Feature[${i}] is not a number:`, value);
      return false;
    }

    // Check NaN
    if (isNaN(value)) {
      console.error(`Feature[${i}] is NaN`);
      return false;
    }

    // Check Infinity
    if (!isFinite(value)) {
      console.error(`Feature[${i}] is not finite:`, value);
      return false;
    }
  }

  return true;
}

/**
 * Update status UI
 * @param {string} status - Status message
 */
export function updateStatus(status) {
  const statusLabel = document.getElementById("statusLabel");
  const statusIndicator = document.getElementById("statusIndicator");

  if (statusLabel) {
    statusLabel.textContent = status.toUpperCase();
  }

  if (statusIndicator) {
    statusIndicator.classList.remove("active", "error");
    if (status.includes("Success") || status.includes("Aman")) {
      statusIndicator.classList.add("active");
    } else if (status.includes("Failed") || status.includes("Berbahaya")) {
      statusIndicator.classList.add("error");
    }
  }
}

/**
 * Tampilkan prediction result di UI
 * @param {Object} result - Prediction result dari API
 */
export function displayPredictionResult(result) {
  const statusLabel = document.getElementById("statusLabel");

  if (!statusLabel) return;

  if (result.success) {
    const emoji = result.prediction === "aman" ? "🟢" : "🔴";
    const predictionText = result.prediction === "aman" ? "AMAN" : "BERBAHAYA";
    const confidence = (result.confidence * 100).toFixed(1);

    statusLabel.innerHTML = `${emoji} ${predictionText} (${confidence}%)`;
    statusLabel.classList.add(result.prediction === "aman" ? "safe" : "danger");
  } else {
    statusLabel.textContent = "PREDICTION FAILED";
    statusLabel.classList.add("error");
  }
}

/**
 * Format bytes untuk display
 * @param {number} bytes
 * @returns {string}
 */
export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Delay promise
 * @param {number} ms - Milliseconds
 * @returns {Promise}
 */
export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get current timestamp untuk logging
 * @returns {string}
 */
export function getTimestamp() {
  return new Date().toLocaleTimeString("id-ID", { hour12: false });
}

/**
 * Validasi kualitas pose sebelum inferensi CNN
 * @param {Object} bestPerson - Hasil deteksi YOLO
 * @param {Array} landmarks - Landmarks asli dari MediaPipe
 * @param {number} frameWidth - Lebar asli frame
 * @param {number} frameHeight - Tinggi asli frame
 * @returns {Object} - { valid: boolean, reason: string }
 */
export function validatePoseQuality(bestPerson, landmarks, frameWidth, frameHeight) {
  // 1. Periksa ukuran bounding box hasil YOLO
  const MAX_BBOX_RATIO = 0.90; // 90% dari frame
  
  if (bestPerson && bestPerson.bbox) {
    let bboxW, bboxH;
    if (Array.isArray(bestPerson.bbox)) {
      const [x1, y1, x2, y2] = bestPerson.bbox;
      bboxW = x2 - x1;
      bboxH = y2 - y1;
    } else {
      bboxW = bestPerson.bbox.width || (bestPerson.bbox.x2 - bestPerson.bbox.x1);
      bboxH = bestPerson.bbox.height || (bestPerson.bbox.y2 - bestPerson.bbox.y1);
    }
    
    if (bboxW > frameWidth * MAX_BBOX_RATIO || bboxH > frameHeight * MAX_BBOX_RATIO) {
      return { valid: false, reason: "Subject too close to camera." };
    }
  }
  
  // 2. Periksa visibility landmark penting
  // Indeks MediaPipe Pose (33 landmarks):
  // 11: left_shoulder, 12: right_shoulder
  // 23: left_hip, 24: right_hip
  // 25: left_knee, 26: right_knee
  const importantIndices = [11, 12, 23, 24, 25, 26];
  const MIN_VISIBILITY = 0.5;
  let goodLandmarksCount = 0;
  
  if (landmarks && landmarks.length > 0) {
    importantIndices.forEach(index => {
      const lm = landmarks[index];
      if (lm && typeof lm.visibility !== "undefined") {
        if (lm.visibility >= MIN_VISIBILITY) {
          goodLandmarksCount++;
        }
      } else {
        // Fallback jika tidak ada skor visibility
        goodLandmarksCount++;
      }
    });
    
    // Jika lebih dari separuh (misal >= 4 dari 6) landmark penting tidak terlihat/kurang bagus
    if (goodLandmarksCount < 3) {
      return { valid: false, reason: "Insufficient visible landmarks." };
    }
  }
  
  return { valid: true, reason: "" };
}
