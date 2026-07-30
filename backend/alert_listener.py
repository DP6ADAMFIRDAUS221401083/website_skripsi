import time
import logging
from firebase_service import db
from notification_service import send_push_notification

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Set untuk melacak alert_id yang sedang diproses agar mencegah race condition
processing_alerts = set()

def on_snapshot(col_snapshot, changes, read_time):
    """
    Callback function yang dipanggil secara otomatis oleh Firestore
    setiap kali ada perubahan pada query (document ditambahkan atau diubah).
    """
    for change in changes:
        if change.type.name == 'ADDED' or change.type.name == 'MODIFIED':
            doc = change.document
            data = doc.to_dict()
            alert_id = doc.id
            
            # Ambil field yang dibutuhkan dari dokumen Firestore
            status = data.get('status')
            is_fcm_sent = data.get('isFcmSent', False)
            uid = data.get('userId')  # Berdasarkan struktur saveAlert di firebase_service.js
            message = data.get('message', 'Terdeteksi ancaman tidak dikenal!')
            
            # Aturan 1: Hanya kirim jika status danger dan belum pernah dikirim
            if status != 'danger' or is_fcm_sent:
                # Kita tidak perlu me-log skip di sini karena akan banyak sekali log untuk status yang bukan danger
                continue
                
            # Aturan 2: Cegah pengiriman notifikasi ganda / race condition
            if alert_id in processing_alerts:
                continue
                
            logging.info(f"New alert detected: {alert_id}")
            
            if uid:
                # Tandai alert sedang diproses
                processing_alerts.add(alert_id)
                logging.info(f"Sending FCM for alert {alert_id} to UID {uid}")
                
                # Payload notifikasi
                title = "SafeVision - Peringatan Bahaya"
                body = message
                
                # Kirim FCM
                success = send_push_notification(uid, title, body, alert_id)
                
                if success:
                    logging.info(f"FCM sent successfully for alert {alert_id}")
                    # Aturan 6: Update dokumen isFcmSent menjadi true
                    try:
                        db.collection('alerts').document(alert_id).update({
                            'isFcmSent': True
                        })
                        logging.info(f"Updated isFcmSent to true for alert {alert_id}")
                        # Kita bisa menghapus dari processing_alerts karena document sudah terupdate 
                        # dan tidak akan masuk query (isFcmSent == False) lagi.
                        processing_alerts.discard(alert_id)
                    except Exception as e:
                        logging.error(f"Failed to update isFcmSent for alert {alert_id}: {e}")
                else:
                    # Aturan 7: Jika gagal, biarkan false agar dapat dicoba lagi
                    logging.warning(f"Failed to send FCM for alert {alert_id}")
                    processing_alerts.discard(alert_id)
            else:
                logging.warning(f"Alert {alert_id} skipped: UID (userId) is missing")

def start_listener():
    if db is None:
        logging.error("Firestore database is not initialized. Cannot start listener.")
        return
        
    logging.info("Firebase alert listener started")
    
    # Memantau collection 'alerts' dengan realtime listener
    # Hanya mengambil dokumen yang belum pernah dikirim notifikasinya
    query = db.collection('alerts').where('isFcmSent', '==', False)
    
    # on_snapshot akan menjalankan listener di thread latar belakang
    query_watch = query.on_snapshot(on_snapshot)
    
    # Biarkan main thread tetap berjalan agar background thread tetap aktif mendengarkan perubahan
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        logging.info("Stopping listener...")
        query_watch.unsubscribe()
        logging.info("Listener stopped.")

if __name__ == '__main__':
    start_listener()
