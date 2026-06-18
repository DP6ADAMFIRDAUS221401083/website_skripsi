# 📁 FrameCast — Project Structure

## Overview

Project telah diorganisir ulang menjadi struktur yang lebih rapi dan mudah dipahami. Tidak ada lagi folder `frontend`/`backend`, semuanya terpusat di root dengan organisasi berbasis jenis file.

---

## 📂 Struktur Lengkap

```
website_skripsi/
│
├── 📁 src/                          # Source code (JavaScript)
│   ├── app.js                       # Main application (orchestrator)
│   ├── config.js                    # API configuration
│   │
│   ├── 📁 modules/                  # AI modules
│   │   ├── camera.js                # Webcam streaming
│   │   ├── yolo.js                  # Person detection (TensorFlow.js)
│   │   ├── mediapipe.js             # Pose extraction (33 landmarks → 66 features)
│   │   └── utils.js                 # Validation & UI utilities
│   │
│   └── 📁 services/                 # External services
│       ├── auth.js                  # Firebase authentication
│       ├── predict.js               # CNN prediction (Hugging Face API)
│       └── login-handler.js         # Login page logic
│
├── 📁 public/                       # HTML files
│   ├── index.html                   # Main application page
│   └── login.html                   # Login page
│
├── 📁 assets/                       # Static assets
│   └── style.css                    # All styling (3000+ lines)
│
├── 📁 docs/                         # Documentation
│   ├── README.md                    # Project overview
│   ├── QUICK_START.md               # Quick start guide
│   ├── REFACTOR_LOG.md              # Refactoring history
│   ├── FILES_SUMMARY.md             # File changes summary
│   ├── FIREBASE_SETUP.md            # Firebase configuration
│   ├── FIREBASE_MIGRATION_SUMMARY.md # Migration notes
│   └── DOKUMENTASI_LOGIN.md         # Login documentation
│
├── 📁 lib/                          # External libraries (future use)
│   └── (empty)
│
└── 📁 .git/                         # Git repository
```

---

## 📝 File Descriptions

### Core Application Files

#### `src/app.js` (Main Orchestrator)

- **Purpose:** Koordinator utama untuk seluruh pipeline
- **Fungsi Utama:**
  - Initialize AI models
  - Manage webcam stream
  - Coordinate detection pipeline
  - Handle user interface
  - Manage prediction results
- **Imports:**
  - Modules: camera, yolo, mediapipe, utils
  - Services: auth, predict
  - Config: API_CONFIG

#### `src/config.js` (Configuration)

- **Purpose:** Centralized API configuration
- **Content:**
  ```javascript
  export const API_CONFIG = {
    BASE_URL: "https://dumdum788-cnn-api-docker.hf.space",
    PREDICT_URL: "https://dumdum788-cnn-api-docker.hf.space/predict",
    TIMEOUT: 10000,
    MAX_RETRIES: 2,
    RETRY_DELAY: 500,
    // ... more settings
  };
  ```

---

### AI Modules (src/modules/)

#### `camera.js`

- **Purpose:** Webcam access and frame capture
- **Exports:** `initCamera()`, `stopCamera()`, `captureFrame()`, `isStreaming()`
- **Uses:** Browser's getUserMedia API

#### `yolo.js`

- **Purpose:** Person detection using YOLO via TensorFlow.js
- **Exports:** `loadYoloModel()`, `detectPersons()`, `cropPerson()`
- **Model:** TensorFlow.js YOLO (pre-trained)

#### `mediapipe.js`

- **Purpose:** Extract 33 pose landmarks from person image
- **Exports:** `initializePoseLandmarker()`, `extractPose()`
- **Output:** 66 features (33 landmarks × 2: x, y coordinates)

#### `utils.js`

- **Purpose:** Helper functions
- **Exports:** `validateFeatures()`, `updateStatus()`, `displayPredictionResult()`

---

### External Services (src/services/)

#### `auth.js`

- **Purpose:** Firebase authentication
- **Exports:** `checkAuthAndRedirect()`, `logout()`
- **Uses:** Firebase Authentication API

#### `predict.js`

- **Purpose:** Send features to CNN API at Hugging Face
- **Exports:** `sendPrediction(features)`
- **Request Format:** 66 float values
- **Response Format:** `{ success, prediction, probability, confidence }`

#### `login-handler.js`

- **Purpose:** Handle login page interactions
- **Uses:** auth.js for Firebase integration

---

### HTML Files (public/)

#### `index.html`

- Main application interface
- Includes: video feed, status indicators, controls, logs
- Imports: `../src/app.js`
- Stylesheet: `../assets/style.css`

#### `login.html`

- Login page for Firebase authentication
- Form for email/password
- Imports: `../src/services/login-handler.js`
- Stylesheet: `../assets/style.css`

---

### Assets (assets/)

#### `style.css`

- Complete UI styling (3000+ lines)
- Preserved from original design
- Supports responsive layout

---

### Documentation (docs/)

All markdown files for reference and setup:

- `README.md` - Project overview
- `QUICK_START.md` - Getting started
- `REFACTOR_LOG.md` - Refactoring details
- `FILES_SUMMARY.md` - File changes
- Firebase docs, login docs, etc.

---

## 🔄 Import Paths Reference

### From `src/app.js`:

```javascript
import { checkAuthAndRedirect, logout } from "./services/auth.js";
import { API_CONFIG } from "./config.js";
import { initCamera, ... } from "./modules/camera.js";
import { loadYoloModel, ... } from "./modules/yolo.js";
import { initializePoseLandmarker, ... } from "./modules/mediapipe.js";
import { sendPrediction } from "./services/predict.js";
import { validateFeatures, ... } from "./modules/utils.js";
```

### From `src/services/predict.js`:

```javascript
import { validateFeatures } from "../modules/utils.js";
import { API_CONFIG } from "../config.js";
```

### From HTML files:

```html
<link rel="stylesheet" href="../assets/style.css" />
<script type="module" src="../src/app.js"></script>
```

---

## 🚀 How to Serve

### Local Development

```bash
# Option 1: Using Laragon (already installed)
# Just open in browser: http://localhost/website_skripsi/public/index.html

# Option 2: Using Python
cd /path/to/website_skripsi/public
python -m http.server 8000
# Open: http://localhost:8000/index.html

# Option 3: Using Node.js
npm install -g http-server
cd /path/to/website_skripsi/public
http-server
```

### Production Deployment

- Copy entire `/website_skripsi` folder to web server
- Point web server to `public/` folder as document root
- Example nginx config:
  ```nginx
  root /var/www/website_skripsi/public;
  index index.html;
  ```

---

## 📊 Statistics

| Aspect              | Count                                    |
| ------------------- | ---------------------------------------- |
| Total Folders       | 6 (src, public, assets, docs, lib, .git) |
| JavaScript Files    | 9 (modules: 4, services: 3, root: 2)     |
| HTML Files          | 2                                        |
| CSS Files           | 1 (3000+ lines)                          |
| Documentation Files | 7                                        |
| **Total Files**     | **19**                                   |

---

## ✅ Migration Checklist

- ✅ Moved AI modules to `src/modules/`
- ✅ Moved services to `src/services/`
- ✅ Moved HTML to `public/`
- ✅ Moved CSS to `assets/`
- ✅ Moved docs to `docs/`
- ✅ Renamed `script.js` to `app.js`
- ✅ Updated all import paths
- ✅ Updated HTML script references
- ✅ Updated HTML stylesheet references
- ✅ Deleted empty `backend/` folder
- ✅ Deleted old `frontend/` folder
- ✅ No errors in any file

---

## 🔍 Accessing Files from Different Locations

### From `public/index.html`:

- CSS: `../assets/style.css` ✅
- JS: `../src/app.js` ✅

### From `src/app.js`:

- Modules: `./modules/camera.js` ✅
- Services: `./services/auth.js` ✅
- Config: `./config.js` ✅

### From `src/services/predict.js`:

- Modules: `../modules/utils.js` ✅
- Config: `../config.js` ✅

---

## 🎯 Project Status

- **Structure:** ✅ Organized
- **Imports:** ✅ Updated
- **Errors:** ✅ None
- **API Integration:** ✅ HF Space only
- **Backend Code:** ✅ Removed
- **UI/CSS:** ✅ Preserved
- **Ready for:** ✅ Production

---

**Last Updated:** 2026-06-18  
**Status:** ✅ Complete & Production Ready
