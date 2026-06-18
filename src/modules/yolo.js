/**
 * FrameCast — yolo.js
 * Module untuk YOLO detection person menggunakan MediaPipe Object Detector
 * (alternative: TensorFlow.js COCO-SSD untuk quick setup)
 */

let objectDetector = null;

/**
 * Load Object Detector model
 * Menggunakan MediaPipe Object Detector atau COCO-SSD sebagai fallback
 * @returns {Promise}
 */
export async function loadYoloModel() {
  try {
    if (objectDetector) return objectDetector;

    // Try MediaPipe Object Detector first
    try {
      const { ObjectDetector, FilesetResolver } =
        await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9");

      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/wasm",
      );

      objectDetector = await ObjectDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite",
        },
        scoreThreshold: 0.3,
        runningMode: "VIDEO",
      });

      console.log("MediaPipe Object Detector loaded");
      return objectDetector;
    } catch (error) {
      console.warn(
        "MediaPipe Object Detector failed, falling back to COCO-SSD",
      );

      // Fallback ke COCO-SSD
      return await loadCocoSsdModel();
    }
  } catch (error) {
    console.error("Failed to load detector model:", error);
    throw error;
  }
}

/**
 * Load COCO-SSD sebagai fallback
 * @returns {Promise}
 */
async function loadCocoSsdModel() {
  // Dynamically load script
  await new Promise((resolve, reject) => {
    if (window.cocoSsd) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src =
      "https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.2";
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });

  objectDetector = await window.cocoSsd.load();
  console.log("COCO-SSD loaded as fallback");
  return objectDetector;
}

/**
 * Deteksi persons di frame
 * @param {HTMLCanvasElement|HTMLImageElement|HTMLVideoElement} input - Input frame
 * @returns {Promise<Object>} - Object dengan {persons: Array, bestPerson: Object}
 */
export async function detectPersons(input) {
  try {
    if (!objectDetector) {
      await loadYoloModel();
    }

    let predictions = [];

    // Check if using MediaPipe or COCO-SSD
    if (objectDetector.detectForVideo) {
      // MediaPipe API
      const result = objectDetector.detectForVideo(input, performance.now());
      predictions = result.detections || [];

      // Convert to common format
      predictions = predictions
        .filter((det) => {
          const categories = det.categories || [];
          return categories.some(
            (cat) => cat.categoryName === "person" && (cat.score || 0) > 0.3,
          );
        })
        .map((det) => ({
          class: "person",
          score: det.categories[0].score,
          bbox: [
            det.boundingBox.originX,
            det.boundingBox.originY,
            det.boundingBox.width,
            det.boundingBox.height,
          ],
        }));
    } else {
      // COCO-SSD API
      predictions = await objectDetector.estimateObjects(input);
      predictions = predictions
        .filter((pred) => pred.class === "person" && (pred.score || 0) > 0.3)
        .map((pred) => ({
          class: "person",
          score: pred.score,
          bbox: [pred.bbox[0], pred.bbox[1], pred.bbox[2], pred.bbox[3]],
        }));
    }

    if (predictions.length === 0) {
      return { persons: [], bestPerson: null };
    }

    // Ambil person dengan confidence tertinggi
    const bestPerson = predictions.reduce((best, current) => {
      return current.score > best.score ? current : best;
    });

    return { persons: predictions, bestPerson };
  } catch (error) {
    console.error("Person detection error:", error);
    throw error;
  }
}

/**
 * Crop image berdasarkan bounding box person
 * @param {HTMLCanvasElement|HTMLVideoElement} source - Source image/video
 * @param {Array} bbox - Bounding box [x, y, width, height] atau object {x, y, width, height}
 * @returns {HTMLCanvasElement} - Cropped canvas
 */
export function cropPerson(source, bbox) {
  // Normalize bbox format
  let x, y, w, h;
  if (Array.isArray(bbox)) {
    [x, y, w, h] = bbox;
  } else {
    x = bbox.x;
    y = bbox.y;
    w = bbox.width;
    h = bbox.height;
  }

  // Jika nilai adalah decimal (0-1), convert ke pixels
  if (x < 1 && y < 1 && w < 1 && h < 1) {
    x *= source.width;
    y *= source.height;
    w *= source.width;
    h *= source.height;
  }

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d");

  // Add padding untuk context
  const padding = 0.1;
  const padX = w * padding;
  const padY = h * padding;

  const sx = Math.max(0, x - padX);
  const sy = Math.max(0, y - padY);
  const sWidth = Math.min(source.width - sx, w + 2 * padX);
  const sHeight = Math.min(source.height - sy, h + 2 * padY);

  ctx.drawImage(
    source,
    sx,
    sy,
    sWidth,
    sHeight,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  return canvas;
}

/**
 * Check if model is loaded
 * @returns {boolean}
 */
export function isModelLoaded() {
  return yoloModel !== null;
}

/**
 * Unload model untuk cleanup
 */
export function unloadModel() {
  yoloModel = null;
}
