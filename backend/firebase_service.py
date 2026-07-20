import logging
import firebase_admin
from firebase_admin import credentials, firestore

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Initialize Firebase Admin
try:
    cred = credentials.Certificate('mobile-skripsi-firebase-adminsdk-fbsvc-ef64091acd.json')
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    logging.info("Firebase Admin initialized successfully in firebase_service")
except Exception as e:
    logging.error(f"Failed to initialize Firebase Admin: {e}")
    db = None

def get_fcm_token(uid):
    """
    Membaca field fcmToken dari koleksi users/{uid} di Firestore.
    Mengembalikan token atau None jika tidak ditemukan.
    """
    if db is None:
        logging.error("Firestore database is not initialized.")
        return None

    try:
        doc_ref = db.collection('users').document(uid)
        doc = doc_ref.get()
        if doc.exists:
            data = doc.to_dict()
            token = data.get('fcmToken')
            if token:
                logging.info(f"Successfully retrieved FCM token for user {uid}")
                return token
            else:
                logging.info(f"User {uid} exists but does not have an FCM token.")
                return None
        else:
            logging.info(f"User document for {uid} does not exist.")
            return None
    except Exception as e:
        logging.error(f"Error retrieving FCM token for {uid}: {e}")
        return None
