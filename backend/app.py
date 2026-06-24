import os
import pickle
import numpy as np
import cv2
from flask import Flask, request, jsonify
from flask_cors import CORS
import face_recognition
import logging

app = Flask(__name__)
CORS(app)

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

ENCODINGS_FILE = "encodings.pkl"

def load_encodings():
    if os.path.exists(ENCODINGS_FILE):
        try:
            with open(ENCODINGS_FILE, "rb") as f:
                return pickle.load(f)
        except Exception as e:
            logging.error(f"Error loading encodings: {e}")
            return {"encodings": [], "names": []}
    return {"encodings": [], "names": []}

def save_encodings(data):
    try:
        with open(ENCODINGS_FILE, "wb") as f:
            pickle.dump(data, f)
        return True
    except Exception as e:
        logging.error(f"Error saving encodings: {e}")
        return False

@app.route("/register-face", methods=["POST"])
def register_face():
    if "image" not in request.files or "name" not in request.form:
        return jsonify({"success": False, "message": "Missing image or name field"}), 400

    name = request.form["name"]
    image_file = request.files["image"]

    try:
        # Load the image using face_recognition
        image = face_recognition.load_image_file(image_file)
        
        # Find all face locations
        face_locations = face_recognition.face_locations(image)
        
        if len(face_locations) == 0:
            return jsonify({"success": False, "message": "No face detected"})
        elif len(face_locations) > 1:
            return jsonify({"success": False, "message": "Multiple faces detected"})
        
        # Get face encoding for the single face
        face_encodings = face_recognition.face_encodings(image, face_locations)
        if len(face_encodings) == 0:
            return jsonify({"success": False, "message": "No face encoding found"})
            
        encoding = face_encodings[0]
        
        # Save encoding
        data = load_encodings()
        data["encodings"].append(encoding)
        data["names"].append(name)
        
        if save_encodings(data):
            logging.info(f"Successfully registered face for user: {name}")
            return jsonify({"success": True, "message": "Face registered successfully"})
        else:
            return jsonify({"success": False, "message": "Failed to save face encoding"}), 500
            
    except Exception as e:
        logging.error(f"Error during face registration: {e}")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route("/recognize-face", methods=["POST"])
def recognize_face():
    if "image" not in request.files:
        return jsonify({"identity": "Unknown", "status": "unknown"})

    image_file = request.files["image"]
    
    try:
        # Load the image using face_recognition
        image = face_recognition.load_image_file(image_file)
        
        # Find faces in the image
        face_locations = face_recognition.face_locations(image)
        
        if len(face_locations) == 0:
            return jsonify({"identity": "Unknown", "status": "unknown"})
            
        # Get face encodings
        face_encodings = face_recognition.face_encodings(image, face_locations)
        
        if len(face_encodings) == 0:
            return jsonify({"identity": "Unknown", "status": "unknown"})
            
        # We process the first face found
        unknown_encoding = face_encodings[0]
        
        data = load_encodings()
        known_encodings = data.get("encodings", [])
        known_names = data.get("names", [])
        
        if not known_encodings:
            return jsonify({"identity": "Unknown", "status": "unknown"})
            
        # Compare faces
        face_distances = face_recognition.face_distance(known_encodings, unknown_encoding)
        
        best_match_index = np.argmin(face_distances)
        if face_distances[best_match_index] <= 0.6:
            name = known_names[best_match_index]
            logging.info(f"Recognized face: {name}")
            return jsonify({"identity": name, "status": "known"})
        else:
            logging.info("Face recognized but distance > 0.6 (Unknown)")
            return jsonify({"identity": "Unknown", "status": "unknown"})
            
    except Exception as e:
        logging.error(f"Error during face recognition: {e}")
        return jsonify({"identity": "Unknown", "status": "unknown"})
@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "status": "running",
        "service": "Face Recognition API"
    })
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
