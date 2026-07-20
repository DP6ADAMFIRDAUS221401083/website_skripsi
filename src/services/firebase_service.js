import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, uploadString, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-storage.js";

// Konfigurasi Firebase (sama dengan konfigurasi pada auth.js)
const firebaseConfig = {
  apiKey: "AIzaSyBG7UnRP0c0jG-zMtWVf6_1Mdza8VNz0ZE",
  authDomain: "mobile-skripsi.firebaseapp.com",
  projectId: "mobile-skripsi",
  storageBucket: "mobile-skripsi.firebasestorage.app",
  messagingSenderId: "735101162067",
  appId: "1:735101162067:web:f602328a1db693bae5eca6",
  measurementId: "G-XCFF3XWN4G",
};

// Mencegah inisialisasi ulang jika app sudah diinisialisasi di auth.js
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Inisialisasi Firebase Services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

/**
 * Mengambil user Firebase yang sedang login.
 * Berguna untuk mendapatkan UID user yang membuat alert.
 * 
 * @returns {Object|null} - Objek user Firebase, atau null jika belum login.
 */
export function getCurrentUser() {
  return auth.currentUser;
}

/**
 * Mengupload screenshot/gambar ke Firebase Storage.
 * 
 * @param {Blob|Uint8Array|ArrayBuffer|String} fileData - Data gambar yang akan diupload (bisa blob/file atau string base64)
 * @param {string} fileName - Nama file tujuan di storage (misalnya: alert_16843.jpg)
 * @param {string} format - Format upload, gunakan 'data_url' jika fileData berupa base64 (opsional, default: 'blob')
 * @returns {Promise<string>} - URL untuk mendownload gambar yang berhasil diupload.
 */
export async function uploadAlertImage(fileData, fileName, format = 'blob') {
  try {
    const storageRef = ref(storage, `alerts/${fileName}`);
    let snapshot;
    
    if (format === 'data_url' || format === 'base64') {
      // Berguna jika canvas HTML diconvert menjadi base64 (Data URL)
      snapshot = await uploadString(storageRef, fileData, 'data_url');
    } else {
      // Berguna jika file berasal dari object Blob
      snapshot = await uploadBytes(storageRef, fileData);
    }

    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading alert image: ", error);
    throw error;
  }
}

/**
 * Menyimpan data alert ke Firestore.
 * 
 * STRUKTUR UNTUK BACKEND FCM (Firebase Cloud Messaging):
 * Dengan menyimpan alert di Firestore, backend (Flask/NodeJS) dapat melakukan "listen"
 * pada koleksi "alerts" ini, dan secara otomatis melakukan trigger untuk mengirim
 * FCM payload ke device (Flutter Android) tiap kali ada dokumen (alert) baru yang ditambahkan.
 * 
 * @param {Object} alertData - Object berisi detail alert (jenis deteksi, confidence, imageUrl, dll)
 * @returns {Promise<string>} - ID dari dokumen Firestore yang baru dibuat.
 */
export async function saveAlert(alertData) {
  try {
    const user = getCurrentUser();
    
    if (!user) {
      throw new Error("User belum login");
    }
    
    const userId = user.uid;
    
    // Struktur dokumen disesuaikan agar konsisten dengan model Alert di aplikasi Flutter
    const dataToSave = {
      userId,
      message: alertData.message,
      confidence: alertData.confidence,
      status: alertData.status,
      imageUrl: alertData.imageUrl,
      createdAt: serverTimestamp(),
      read: alertData.read !== undefined ? alertData.read : false,
      isFcmSent: false
    };

    const alertsRef = collection(db, "alerts");
    const docRef = await addDoc(alertsRef, dataToSave);
    
    return docRef.id;
  } catch (error) {
    console.error("Error saving alert to Firestore: ", error);
    throw error;
  }
}

/* 
 * ============================================================
 * PERSIAPAN STRUKTUR FIREBASE CLOUD MESSAGING (FCM)
 * ============================================================
 * 
 * (TIDAK DIIMPLEMENTASIKAN SEKARANG SESUAI INSTRUKSI)
 * 
 * Nantinya jika dibutuhkan untuk Frontend Web menerima notif atau
 * menyimpan Device Token ke Firestore, Anda bisa mengaktifkannya seperti ini:
 * 
 * import { getMessaging, getToken } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-messaging.js";
 * 
 * export async function saveUserFcmToken(token) {
 *    const user = getCurrentUser();
 *    if (!user) return;
 *    // Simpan token ke dalam collection "users"
 *    // backend nantinya query token ini untuk kirim notifikasi
 * }
 */
