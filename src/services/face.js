import { API_CONFIG } from "../config.js";

/**
 * Mengubah elemen canvas menjadi file gambar (Blob)
 * @param {HTMLCanvasElement} canvas 
 * @returns {Promise<Blob>}
 */
function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Gagal mengubah canvas ke blob"));
        }
      }, "image/jpeg", 0.9);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Mengirim frame ke backend untuk Face Recognition
 * @param {HTMLCanvasElement} canvas - Frame gambar dari kamera
 * @returns {Promise<{identity: string, status: string}>}
 */
export async function recognizeFace(canvas) {
  try {
    const blob = await canvasToBlob(canvas);
    
    const formData = new FormData();
    formData.append("image", blob, "frame.jpg");

    // Gunakan timeout agar tidak memblokir pipeline utama terlalu lama
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 seconds timeout

    const response = await fetch(API_CONFIG.FACE_API_URL, {
      method: "POST",
      body: formData,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Face API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      identity: data.identity || "Unknown",
      status: data.status || "unknown"
    };
  } catch (error) {
    console.warn("Face recognition failed or timed out:", error.message);
    // Kembalikan unknown agar pipeline tetap berlanjut meskipun error
    return {
      identity: "Unknown",
      status: "unknown"
    };
  }
}
