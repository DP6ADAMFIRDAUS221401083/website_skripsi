/**
 * cooldown_service.js
 * 
 * Implementasi sistem cooldown notifikasi PER USER untuk mencegah spam ke Firebase.
 * Menggunakan localStorage untuk penyimpanan persisten di browser berdasarkan userId.
 */

const COOLDOWN_MINUTES = 10;
const COOLDOWN_MS = COOLDOWN_MINUTES * 60 * 1000;
const STORAGE_PREFIX = "safevision_cooldown_";

/**
 * Mengecek apakah pipeline boleh melanjutkan upload dan notifikasi ke Firebase.
 * 
 * @param {string} userId - Firebase Authentication userId (UID).
 * @param {string} currentStatus - Status deteksi saat ini (misal: "danger" atau "safe").
 * @returns {boolean} - true jika lolos cooldown (boleh upload), false jika tidak.
 */
export function shouldCreateAlert(userId, currentStatus) {
    if (!userId) {
        console.warn("[Cooldown] userId tidak valid. Alert diblokir.");
        return false;
    }

    // Jika tidak ada status yang diteruskan, asumsikan default adalah "danger" untuk fallback.
    const status = currentStatus ? currentStatus.toLowerCase() : "danger";
    const storageKey = `${STORAGE_PREFIX}${userId}`;
    const rawData = localStorage.getItem(storageKey);
    
    // Default state
    let state = {
        lastStatus: "safe",
        lastAlertTime: 0
    };

    if (rawData) {
        try {
            state = JSON.parse(rawData);
        } catch (e) {
            console.error("[Cooldown] Gagal membaca data cooldown, reset ke default.", e);
        }
    }

    const now = Date.now();

    // Jika pipeline mendeteksi "safe", kita update riwayat status menjadi "safe",
    // lalu kembalikan false karena kita tidak perlu nge-upload alert "safe" ke database.
    if (status === "safe") {
        if (state.lastStatus !== "safe") {
            state.lastStatus = "safe";
            localStorage.setItem(storageKey, JSON.stringify(state));
        }
        return false;
    }

    // --- MULAI LOGIKA "DANGER" ---
    let isAllowed = false;

    if (state.lastStatus === "safe") {
        // Logika 1: Sebelumnya SAFE lalu berubah menjadi DANGER -> Langsung Lolos
        isAllowed = true;
    } else if (state.lastStatus === "danger") {
        // Logika 2: Masih DANGER terus menerus -> Cek waktu (10 menit)
        const elapsed = now - state.lastAlertTime;
        if (elapsed >= COOLDOWN_MS) {
            isAllowed = true;
        } else {
            isAllowed = false;
        }
    }

    // Jika sistem memperbolehkan alert, kita update waktu terakhir & status ke DANGER
    if (isAllowed) {
        state.lastStatus = "danger";
        state.lastAlertTime = now;
        localStorage.setItem(storageKey, JSON.stringify(state));
    }

    return isAllowed;
}

/**
 * (Opsional) Mereset cooldown user secara manual.
 * Bisa dipanggil saat user log out.
 * 
 * @param {string} userId - Firebase Authentication userId (UID).
 */
export function resetUserCooldown(userId) {
    if (userId) {
        localStorage.removeItem(`${STORAGE_PREFIX}${userId}`);
    }
}
