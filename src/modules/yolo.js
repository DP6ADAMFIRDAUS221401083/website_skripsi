/**
 * FrameCast — yolo.js
 * Module untuk YOLOv8 detection person menggunakan ONNX Runtime Web
 */

let ortSession = null;

/**
 * Load YOLOv8 ONNX model
 * @returns {Promise}
 */
export async function loadYoloModel() {
  try {
    if (ortSession) return ortSession;

    // Load ONNX Runtime Web dynamically
    await new Promise((resolve, reject) => {
      if (window.ort) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.min.js";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });

    // Load the model dari path /models/yolov8n.onnx (relatif terhadap public/)
    ortSession = await ort.InferenceSession.create("/models/yolov8n.onnx", {
      executionProviders: ["wasm"],
    });

    console.log("YOLOv8 ONNX model loaded");
    return ortSession;
  } catch (error) {
    console.error("Failed to load YOLOv8 model:", error);
    throw error;
  }
}

/**
 * Preprocess image for YOLOv8 (resize to 640x640, normalize to 0-1)
 */
function preprocessImage(input, targetSize = 640) {
  const canvas = document.createElement("canvas");
  canvas.width = targetSize;
  canvas.height = targetSize;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  
  // Draw the image stretched to targetSize x targetSize
  ctx.drawImage(input, 0, 0, targetSize, targetSize);
  
  const imgData = ctx.getImageData(0, 0, targetSize, targetSize);
  const data = imgData.data;
  
  // Float32Array for tensor (1, 3, 640, 640)
  const float32Data = new Float32Array(3 * targetSize * targetSize);
  
  for (let i = 0; i < targetSize * targetSize; i++) {
    float32Data[i] = data[i * 4] / 255.0; // R
    float32Data[targetSize * targetSize + i] = data[i * 4 + 1] / 255.0; // G
    float32Data[2 * targetSize * targetSize + i] = data[i * 4 + 2] / 255.0; // B
  }
  
  return float32Data;
}

/**
 * Deteksi persons di frame
 * @param {HTMLCanvasElement|HTMLImageElement|HTMLVideoElement} input - Input frame
 * @returns {Promise<Object>} - Object dengan {persons: Array, bestPerson: Object}
 */
export async function detectPersons(input) {
  try {
    if (!ortSession) {
      await loadYoloModel();
    }

    const targetSize = 640;
    const float32Data = preprocessImage(input, targetSize);
    const tensor = new ort.Tensor("float32", float32Data, [1, 3, targetSize, targetSize]);
    
    const results = await ortSession.run({ images: tensor });
    const output = results[ortSession.outputNames[0]].data;
    
    // Output shape for yolov8n is [1, 84, 8400]
    // index (f * 8400 + j) di mana f: (0=xc, 1=yc, 2=w, 3=h, 4=class0 probability)
    
    let bestScore = 0.3; // minimum threshold
    let bestBox = null;
    let persons = [];
    
    const numAnchors = 8400;
    
    // Check if the original image has videoWidth/Height or width/height
    const origW = input.videoWidth || input.width;
    const origH = input.videoHeight || input.height;
    
    const scaleX = origW / targetSize;
    const scaleY = origH / targetSize;
    
    for (let j = 0; j < numAnchors; j++) {
      // Probability of class 0 (person)
      const pPerson = output[4 * numAnchors + j];
      
      if (pPerson > 0.3) {
        const xc = output[0 * numAnchors + j];
        const yc = output[1 * numAnchors + j];
        const w = output[2 * numAnchors + j];
        const h = output[3 * numAnchors + j];
        
        // Scale back to original dimensions
        const x1 = (xc - w / 2) * scaleX;
        const y1 = (yc - h / 2) * scaleY;
        const x2 = (xc + w / 2) * scaleX;
        const y2 = (yc + h / 2) * scaleY;
        
        const box = {
          class: "person",
          score: pPerson,
          bbox: [x1, y1, x2, y2]
        };
        
        persons.push(box);
        
        if (pPerson > bestScore) {
          bestScore = pPerson;
          bestBox = box;
        }
      }
    }

    return { persons, bestPerson: bestBox };
  } catch (error) {
    console.error("Person detection error:", error);
    throw error;
  }
}

/**
 * Crop image berdasarkan bounding box person (x1, y1, x2, y2)
 * @param {HTMLCanvasElement|HTMLVideoElement} source - Source image/video
 * @param {Array} bbox - Bounding box [x1, y1, x2, y2]
 * @returns {HTMLCanvasElement} - Cropped canvas
 */
export function cropPerson(source, bbox) {
  let x1, y1, x2, y2;
  if (Array.isArray(bbox)) {
    [x1, y1, x2, y2] = bbox;
  } else {
    x1 = bbox.x1 || bbox.x;
    y1 = bbox.y1 || bbox.y;
    x2 = bbox.x2 || (x1 + bbox.width);
    y2 = bbox.y2 || (y1 + bbox.height);
  }

  const w = Math.max(0, x2 - x1);
  const h = Math.max(0, y2 - y1);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  const sourceW = source.videoWidth || source.width;
  const sourceH = source.videoHeight || source.height;

  // Clamp values so we don't go out of bounds
  const sx = Math.max(0, x1);
  const sy = Math.max(0, y1);
  const sWidth = Math.min(sourceW - sx, w);
  const sHeight = Math.min(sourceH - sy, h);

  ctx.drawImage(
    source,
    sx,
    sy,
    sWidth,
    sHeight,
    0,
    0,
    sWidth,
    sHeight,
  );

  return canvas;
}

/**
 * Check if model is loaded
 * @returns {boolean}
 */
export function isModelLoaded() {
  return ortSession !== null;
}

/**
 * Unload model untuk cleanup
 */
export function unloadModel() {
  ortSession = null;
}
