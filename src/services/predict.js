/**
 * FrameCast — predict.js
 * CNN prediction via Hugging Face Docker Space API
 *
 * Backend: https://dumdum788-cnn-api-docker.hf.space
 * Endpoint: POST /predict
 */

import { validateFeatures } from "../modules/utils.js";
import { API_CONFIG } from "../config.js";

/**
 * Kirim features ke CNN API dan dapatkan prediction
 * @param {Array} features - 66-dimensional feature array
 * @returns {Promise<Object>} - Prediction result
 */
export async function sendPrediction(features) {
  try {
    // Validasi features terlebih dahulu
    if (!validateFeatures(features)) {
      return {
        success: false,
        error: "Invalid features",
        prediction: null,
        probability: null,
        confidence: null,
      };
    }

    // Prepare request payload
    const payload = {
      features: features,
    };

    // Try dengan retry logic
    for (let attempt = 0; attempt <= API_CONFIG.MAX_RETRIES; attempt++) {
      try {
        const result = await fetchWithTimeout(
          API_CONFIG.PREDICT_URL,
          payload,
          API_CONFIG.TIMEOUT,
        );
        return result;
      } catch (error) {
        if (attempt < API_CONFIG.MAX_RETRIES) {
          console.warn(
            `Attempt ${attempt + 1} failed, retrying...`,
            error.message,
          );
          await new Promise((resolve) =>
            setTimeout(resolve, API_CONFIG.RETRY_DELAY),
          );
        } else {
          throw error;
        }
      }
    }
  } catch (error) {
    console.error("Prediction error:", error);
    return {
      success: false,
      error: error.message,
      prediction: null,
      probability: null,
      confidence: null,
    };
  }
}

/**
 * Fetch dengan timeout
 * @param {string} endpoint - API endpoint
 * @param {Object} payload - Request payload
 * @param {number} timeout - Timeout dalam ms
 * @returns {Promise<Object>}
 */
async function fetchWithTimeout(endpoint, payload, timeout) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Validate response format
    if (!data.success) {
      return {
        success: false,
        error: data.error || "API returned success=false",
        prediction: null,
        probability: null,
        confidence: null,
      };
    }

    return {
      success: true,
      prediction: data.prediction, // "aman" atau "berbahaya"
      probability: data.probability, // Probabilitas dari kelas minoritas
      confidence: data.confidence, // Confidence score (0-1)
      error: null,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === "AbortError") {
      throw new Error("Request timeout");
    }

    throw error;
  }
}

/**
 * Parse prediction result untuk UI display
 * @param {Object} result - Prediction result dari API
 * @returns {Object} - Parsed result
 */
export function parsePredictionResult(result) {
  if (!result.success) {
    return {
      status: "failed",
      message: result.error || "Prediction failed",
      emoji: "❌",
    };
  }

  const isAman = result.prediction === "aman";
  const emoji = isAman ? "🟢" : "🔴";
  const status = isAman ? "AMAN" : "BERBAHAYA";
  const confidence = (result.confidence * 100).toFixed(1);

  return {
    status: isAman ? "safe" : "danger",
    message: `${emoji} ${status} (${confidence}%)`,
    emoji,
    prediction: result.prediction,
    confidence: result.confidence,
  };
}
