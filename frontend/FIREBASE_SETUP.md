# Firebase Authentication Setup Guide

## Langkah-langkah Setup Firebase Users

### 1. Buka Firebase Console

- Kunjungi https://console.firebase.google.com/
- Pilih project **mobile-skripsi** (sudah dikonfigurasi)

### 2. Aktifkan Email/Password Authentication

1. Di sidebar kiri, pilih **Authentication** → **Get Started**
2. Pilih **Sign-in method** tab
3. Cari dan klik **Email/Password**
4. Aktifkan toggle untuk **Email/Password**
5. Klik **Save**

### 3. Tambah User Test

1. Masih di **Authentication**, pilih tab **Users**
2. Klik tombol **Add User**
3. Masukkan:
   - **Email**: `test@example.com` (bisa disesuaikan)
   - **Password**: `Test123!` (minimal 6 karakter)
4. Klik **Add User**

### 4. Konfigurasi Security Rules

1. Di sidebar, pilih **Firestore Database** (jika perlu)
2. Klik tab **Rules**
3. Gunakan rules berikut untuk testing:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Izinkan read/write jika user sudah authenticated
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

5. Klik **Publish**

### 5. Test Login di Aplikasi

Buka `login.html` dan coba login dengan:

- **Email**: `test@example.com`
- **Password**: `Test123!`

## Troubleshooting

### Login Gagal "Email atau password salah"

- Pastikan email dan password sudah terdaftar di Firebase Console
- Periksa email sudah lowercase
- Pastikan internet connection aktif

### Error "Koneksi internet gagal"

- Pastikan URL CDN Firebase dapat diakses
- Cek console browser (F12) untuk error details

### Error "Operasi login tidak diizinkan"

- Pastikan Email/Password authentication sudah diaktifkan
- Buka kembali Firebase Console > Authentication > Sign-in method

## Testing dengan Multiple Users

Untuk menambah lebih banyak users:

1. Kembali ke Firebase Console > Authentication > Users
2. Klik **Add User** untuk setiap user baru
3. Gunakan email dan password yang berbeda

## Catatan Penting

- **Jangan hardcode password** di aplikasi
- **Selalu gunakan HTTPS** di production
- Firebase SDK sudah ter-import dari CDN
- Session disimpan di localStorage dan auth state Firebase

## File Konfigurasi

Konfigurasi Firebase ada di `auth.js`:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyBG7UnRP0c0jG-zMtWVf6_1Mdza8VNz0ZE",
  authDomain: "mobile-skripsi.firebaseapp.com",
  projectId: "mobile-skripsi",
  storageBucket: "mobile-skripsi.firebasestorage.app",
  messagingSenderId: "735101162067",
  appId: "1:735101162067:web:f602328a1db693bae5eca6",
  measurementId: "G-XCFF3XWN4G",
};
```

Jangan ubah nilai ini kecuali Anda memiliki project Firebase yang berbeda.
