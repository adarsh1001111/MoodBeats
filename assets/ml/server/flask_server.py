from flask import Flask, request, jsonify
import joblib
import pandas as pd
import numpy as np
import os
from scipy.stats import entropy, skew, kurtosis
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})  # Enable CORS for all routes and origins

# Load models and data
MODEL_PATH = os.path.dirname(os.path.abspath(__file__))
PARENT_DIR = os.path.dirname(MODEL_PATH)  # ml directory
MODELS_DIR = os.path.join(PARENT_DIR, 'models')
SONGS_CSV = os.path.join(PARENT_DIR, 'indexed_song_list_final.csv')

print(f"Loading models from {MODELS_DIR}")

# Load models
try:
    model1 = joblib.load(os.path.join(MODELS_DIR, 'xgb_emotion_model.pkl'))
    scaler1 = joblib.load(os.path.join(MODELS_DIR, 'xgb_scaler.pkl'))
    model2 = joblib.load(os.path.join(MODELS_DIR, 'xgb_emotion_model2.pkl'))
    scaler2 = joblib.load(os.path.join(MODELS_DIR, 'xgb_scaler2.pkl'))
    print("Models loaded successfully")
except Exception as e:
    print(f"Error loading models: {e}")
    raise

# Load song database
try:
    songs_df = pd.read_csv(SONGS_CSV)
    print(f"Loaded {len(songs_df)} songs from {SONGS_CSV}")
except Exception as e:
    print(f"Error loading song database: {e}")
    songs_df = pd.DataFrame(columns=['index', 'title', 'artists'])

# Define mood categories
MOOD_NAMES = ['Happy', 'Angry', 'Sad', 'Relaxed']

# Helper function to extract features from heart rate and accelerometer data
def extract_features(hr_data, acc_data=None):
    """Extract statistical features from heart rate and accelerometer data"""
    
    # Extract heart rate features
    hr_features = [
        np.mean(hr_data),
        np.std(hr_data),
        np.min(hr_data),
        np.max(hr_data),
        np.sum(hr_data**2) / len(hr_data),  # Energy
        skew(hr_data) if len(hr_data) > 2 else 0,
        kurtosis(hr_data) if len(hr_data) > 3 else 0,
        entropy(np.histogram(hr_data, bins=10, density=True)[0] + 1e-6)
    ]
    
    # If accelerometer data is provided, extract features for each axis
    acc_features = []
    if acc_data is not None and len(acc_data) > 0:
        # Reshape accelerometer data to [n_samples, 3] if needed
        if isinstance(acc_data[0], list) and len(acc_data[0]) == 3:
            # Data is already in the format [[x, y, z], ...]
            acc_data = np.array(acc_data)
        else:
            # Assume flat array, reshape to [n_samples/3, 3]
            acc_data = np.array(acc_data).reshape(-1, 3)
        
        # Extract features for each axis
        for axis in range(3):
            axis_data = acc_data[:, axis]
            axis_features = [
                np.mean(axis_data),
                np.std(axis_data),
                np.min(axis_data),
                np.max(axis_data),
                np.sum(axis_data**2) / len(axis_data),  # Energy
                skew(axis_data) if len(axis_data) > 2 else 0,
                kurtosis(axis_data) if len(axis_data) > 3 else 0,
                entropy(np.histogram(axis_data, bins=10, density=True)[0] + 1e-6)
            ]
            acc_features.extend(axis_features)
    else:
        # If no accelerometer data, use zeros
        acc_features = [0] * (8 * 3)  # 8 features for each of 3 axes
    
    # Combine features
    features = hr_features + acc_features
    return np.array(features).reshape(1, -1)

@app.route('/api/predict-mood', methods=['POST'])
def predict_mood():
    try:
        # Get data from request
        data = request.json
        print(f"Received prediction request: {data}")
        
        heart_rate = data.get('heart_rate')
        accelerometer = data.get('accelerometer')
        
        if not heart_rate:
            return jsonify({"error": "Heart rate data is required"}), 400
        
        # If heart_rate is a single value, create a synthetic sequence
        if isinstance(heart_rate, (int, float)):
            hr_sequence = np.random.normal(heart_rate, scale=2, size=30)
            hr_sequence = np.clip(hr_sequence, heart_rate - 5, heart_rate + 5)
        else:
            hr_sequence = np.array(heart_rate)
        
        # Extract features
        features = extract_features(hr_sequence, accelerometer)
        
        # Scale features
        scaled_features1 = scaler1.transform(features)
        scaled_features2 = scaler2.transform(features)
        
        # Make predictions with both models
        pred1 = model1.predict(scaled_features1)[0]
        pred2 = model2.predict(scaled_features2)[0]
        
        # Get confidence scores (probabilities)
        proba1 = model1.predict_proba(scaled_features1)[0]
        proba2 = model2.predict_proba(scaled_features2)[0]
        
        # Combine probabilities from both models (weighted average)
        combined_proba = 0.6 * proba1 + 0.4 * proba2
        
        # Get the final mood based on highest combined probability
        final_mood_idx = np.argmax(combined_proba)
        final_mood = MOOD_NAMES[final_mood_idx]
        
        # Secondary mood is the second highest probability
        secondary_idx = np.argsort(combined_proba)[-2]
        secondary_mood = MOOD_NAMES[secondary_idx]
        
        # Create confidence scores dictionary
        confidence = {
            MOOD_NAMES[i]: float(combined_proba[i]) for i in range(len(MOOD_NAMES))
        }
        
        return jsonify({
            "primary_mood": final_mood,
            "secondary_mood": secondary_mood,
            "model1_prediction": MOOD_NAMES[pred1],
            "model2_prediction": MOOD_NAMES[pred2],
            "confidence": confidence
        })
        
    except Exception as e:
        print(f"Error predicting mood: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/api/recommend-songs', methods=['POST'])
def recommend_songs():
    try:
        data = request.json
        mood = data.get('mood')
        
        if not mood or mood not in MOOD_NAMES:
            return jsonify({"error": f"Invalid mood. Must be one of {MOOD_NAMES}"}), 400
        
        # Recommend songs based on mood
        mood_index = MOOD_NAMES.index(mood)
        
        # Map mood index to range of song indices in our dataset
        song_ranges = {
            0: (1, 20),   # Happy: songs 1-20
            1: (61, 80),  # Angry: songs 61-80
            2: (21, 40),  # Sad: songs 21-40
            3: (41, 60),  # Relaxed: songs 41-60
        }
        
        start_idx, end_idx = song_ranges[mood_index]
        
        # Filter songs by index range
        mood_songs = songs_df[songs_df['index'].between(start_idx, end_idx)]
        
        # Return a list of recommended songs
        recommendations = mood_songs[['index', 'title', 'artists']].to_dict('records')
        
        return jsonify({
            "mood": mood,
            "recommendations": recommendations
        })
        
    except Exception as e:
        print(f"Error recommending songs: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/song-details/<int:song_id>', methods=['GET'])
def song_details(song_id):
    try:
        # Find the song with the given ID
        song = songs_df[songs_df['index'] == song_id]
        
        if song.empty:
            return jsonify({"error": "Song not found"}), 404
        
        # Get the song details
        details = song.iloc[0].to_dict()
        
        # Format song name for file path
        song_title = ''.join(c if c.isalnum() else '_' for c in details['title'])
        artist_name = ''.join(c if c.isalnum() else '_' for c in details['artists'].split(',')[0])
        
        filename = f"{str(song_id).zfill(2)}_{song_title}_{artist_name}"
        
        # Get file paths
        SONGS_DIR = os.path.join(PARENT_DIR, 'songs', 'samples')
        audio_path = os.path.join(SONGS_DIR, f"{filename}.mp3")
        
        # Check if file exists
        has_audio = os.path.exists(audio_path)
        
        return jsonify({
            "id": int(details['index']),
            "title": details['title'],
            "artist": details['artists'],
            "has_audio": has_audio,
            "audio_path": audio_path if has_audio else None
        })
        
    except Exception as e:
        print(f"Error getting song details: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "ok",
        "model1": "loaded" if 'model1' in globals() else "not loaded",
        "model2": "loaded" if 'model2' in globals() else "not loaded",
        "songs_count": len(songs_df)
    })

if __name__ == '__main__':
    print("🎵 Starting MoodBeats Flask Server")
    print("🔮 Models loaded from:", MODELS_DIR)
    print("📝 Song database loaded:", SONGS_CSV)
    app.run(host='0.0.0.0', port=5000, debug=True, threaded=True)
