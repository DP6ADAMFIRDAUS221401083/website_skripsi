import logging
from firebase_admin import messaging
from firebase_service import get_fcm_token

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def send_push_notification(uid, title, body, alert_id=None):
    """
    Mengirimkan push notification ke device pengguna menggunakan FCM.
    """
    logging.info(f"Mencoba mengirim push notification ke UID: {uid}")
    
    # 1. Ambil token menggunakan fungsi dari firebase_service
    token = get_fcm_token(uid)
    
    if not token:
        logging.warning(f"Proses dihentikan. Token tidak ditemukan untuk UID: {uid}")
        return False
        
    logging.info(f"Token ditemukan untuk UID {uid}: {token}")
    
    # 2. Siapkan payload data
    data_payload = {
        'click_action': 'FLUTTER_NOTIFICATION_CLICK'
    }
    
    if alert_id:
        data_payload['alertId'] = str(alert_id)
        
    # 3. Buat objek pesan
    message = messaging.Message(
        notification=messaging.Notification(
            title=title,
            body=body,
        ),
        data=data_payload,
        token=token,
    )
    
    # 4. Kirim pesan via Firebase Admin SDK
    try:
        response = messaging.send(message)
        logging.info(f"Berhasil mengirim push notification ke UID {uid}. Message ID: {response}")
        return True
    except Exception as e:
        logging.error(f"Gagal mengirim push notification ke UID {uid}. Error Firebase: {e}")
        return False
