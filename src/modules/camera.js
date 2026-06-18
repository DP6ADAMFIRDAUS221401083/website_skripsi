/**
 * FrameCast — camera.js
 * Module untuk menangani webcam streaming
 */

let stream = null;
let videoElement = null;

/**
 * Inisialisasi kamera dan dapatkan video stream
 * @returns {Promise<MediaStream>}
 */
export async function initCamera() {
  try {
    videoElement = document.getElementById("videoFeed");

    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: "environment",
      },
      audio: false,
    });

    videoElement.srcObject = stream;
    await videoElement.play();

    return stream;
  } catch (error) {
    console.error("Camera error:", error);
    throw error;
  }
}

/**
 * Hentikan camera stream
 */
export function stopCamera() {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    stream = null;
  }

  if (videoElement) {
    videoElement.srcObject = null;
  }
}

/**
 * Get current video frame sebagai canvas
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @returns {HTMLCanvasElement}
 */
export function captureFrame(width = 640, height = 480) {
  if (!videoElement || videoElement.readyState < 2) {
    throw new Error("Video not ready");
  }

  const canvas = document.getElementById("captureCanvas") || createCanvas();
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(videoElement, 0, 0, width, height);

  return canvas;
}

/**
 * Create hidden canvas untuk capture
 * @returns {HTMLCanvasElement}
 */
function createCanvas() {
  const canvas = document.createElement("canvas");
  canvas.id = "captureCanvas";
  canvas.style.display = "none";
  document.body.appendChild(canvas);
  return canvas;
}

/**
 * Get video element
 * @returns {HTMLVideoElement}
 */
export function getVideoElement() {
  return videoElement || document.getElementById("videoFeed");
}

/**
 * Check if camera is streaming
 * @returns {boolean}
 */
export function isStreaming() {
  return stream !== null && videoElement && videoElement.readyState >= 2;
}
