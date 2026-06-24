/**
 * FrameCast — config.js
 * Konfigurasi API Hugging Face
 *
 * Backend CNN sudah tersedia dan production-ready
 */

export const API_CONFIG = {
  // Hugging Face Docker Space URL
  BASE_URL: "https://dumdum788-cnn-api-docker.hf.space",

  // Endpoint untuk prediction
  PREDICT_URL: "https://dumdum788-cnn-api-docker.hf.space/predict",

  // Face Recognition Backend URL
  FACE_API_URL: "http://localhost:5000/recognize-face",

  // API Timeout (milliseconds)
  TIMEOUT: 10000,

  // Max retry attempts
  MAX_RETRIES: 2,

  // Retry delay (milliseconds)
  RETRY_DELAY: 500,

  // Feature count yang diharapkan
  EXPECTED_FEATURES: 66,

  // Prediction interval (milliseconds)
  PREDICTION_INTERVAL: 1000,

  // Detection confidence threshold
  DETECTION_CONFIDENCE: 0.3,
};

/**
 * Validate config
 */
if (!API_CONFIG.BASE_URL || !API_CONFIG.PREDICT_URL) {
  throw new Error("API configuration is incomplete");
}
