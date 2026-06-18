/**
 * FrameCast — mediapipe.js
 * Module untuk MediaPipe Pose extraction
 */

import {
  PoseLandmarker,
  FilesetResolver,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9";

let poseLandmarker = null;
const POSE_LANDMARKS_COUNT = 33; // MediaPipe pose has 33 landmarks
const FEATURES_PER_LANDMARK = 2; // x, y (NOT z or visibility)
const TOTAL_FEATURES = POSE_LANDMARKS_COUNT * FEATURES_PER_LANDMARK; // 66

/**
 * Initialize MediaPipe Pose Landmarker
 * @returns {Promise<PoseLandmarker>}
 */
export async function initializePoseLandmarker() {
  try {
    if (poseLandmarker) return poseLandmarker;

    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/wasm",
    );

    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task",
      },
      runningMode: "VIDEO",
      numPoses: 1, // Only detect 1 pose
    });

    console.log("MediaPipe Pose Landmarker initialized");
    return poseLandmarker;
  } catch (error) {
    console.error("Failed to initialize MediaPipe:", error);
    throw error;
  }
}

/**
 * Extract pose landmarks dari image/video frame
 * @param {HTMLCanvasElement|HTMLVideoElement|HTMLImageElement} image - Input frame
 * @returns {Promise<Object>} - Object dengan {landmarks, features, success}
 */
export async function extractPose(image) {
  try {
    if (!poseLandmarker) {
      await initializePoseLandmarker();
    }

    const result = poseLandmarker.detectForVideo(image, performance.now());

    if (!result.landmarks || result.landmarks.length === 0) {
      return {
        landmarks: null,
        features: null,
        success: false,
        error: "No pose detected",
      };
    }

    // Ambil pose pertama dan terbaik
    const landmarks = result.landmarks[0];

    // Extract x, y dari setiap landmark (TIDAK menggunakan z atau visibility)
    const features = [];

    for (let i = 0; i < landmarks.length; i++) {
      const landmark = landmarks[i];
      features.push(landmark.x);
      features.push(landmark.y);
    }

    // Validasi
    if (features.length !== TOTAL_FEATURES) {
      return {
        landmarks,
        features: null,
        success: false,
        error: `Expected ${TOTAL_FEATURES} features, got ${features.length}`,
      };
    }

    return {
      landmarks,
      features,
      success: true,
    };
  } catch (error) {
    console.error("Pose extraction error:", error);
    return {
      landmarks: null,
      features: null,
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get total features count
 * @returns {number}
 */
export function getTotalFeatures() {
  return TOTAL_FEATURES;
}

/**
 * Check if pose landmarker is initialized
 * @returns {boolean}
 */
export function isInitialized() {
  return poseLandmarker !== null;
}

/**
 * Cleanup - unload model
 */
export function cleanup() {
  poseLandmarker = null;
}

/**
 * Draw landmarks on canvas untuk debugging
 * @param {HTMLCanvasElement} canvas - Canvas untuk draw
 * @param {Array} landmarks - Pose landmarks
 */
export function drawLandmarks(canvas, landmarks) {
  if (!landmarks || landmarks.length === 0) return;

  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;

  // Draw landmarks
  ctx.fillStyle = "#00ff00";
  ctx.strokeStyle = "#00ff00";
  ctx.lineWidth = 2;

  landmarks.forEach((landmark) => {
    const x = landmark.x * w;
    const y = landmark.y * h;

    ctx.beginPath();
    ctx.arc(x, y, 3, 0, 2 * Math.PI);
    ctx.fill();
  });
}
