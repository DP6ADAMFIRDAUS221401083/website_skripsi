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
