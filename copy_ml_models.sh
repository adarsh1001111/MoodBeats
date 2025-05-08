#!/bin/bash
# Script to copy ML models and song files from Downloads to the app

# Define source and target directories
SOURCE_DIR="/Users/adarshamit1001/Downloads/music"
TARGET_DIR="/Users/adarshamit1001/Desktop/MoodBeats_fixed/assets/ml"

# Create target directory if it doesn't exist
mkdir -p "$TARGET_DIR"
mkdir -p "$TARGET_DIR/models"
mkdir -p "$TARGET_DIR/songs"

# Copy model files
echo "Copying ML models..."
cp "$SOURCE_DIR/xgb_emotion_model.pkl" "$TARGET_DIR/models/"
cp "$SOURCE_DIR/xgb_scaler.pkl" "$TARGET_DIR/models/"
cp "$SOURCE_DIR/xgb_emotion_model2.pkl" "$TARGET_DIR/models/"
cp "$SOURCE_DIR/xgb_scaler2.pkl" "$TARGET_DIR/models/"

# Copy song list
echo "Copying song list..."
cp "$SOURCE_DIR/indexed_song_list_final.csv" "$TARGET_DIR/"

# Create a directory for sample songs (we won't copy all the songs as it would be too large)
mkdir -p "$TARGET_DIR/songs/samples"

# Copy a few sample songs
echo "Copying sample songs..."
cp "$SOURCE_DIR/mood_music_dataset/full_songs/01_Happy_Pharrell_Williams.mp3" "$TARGET_DIR/songs/samples/"
cp "$SOURCE_DIR/mood_music_dataset/full_songs/21_Someone_Like_You_Adele.mp3" "$TARGET_DIR/songs/samples/"
cp "$SOURCE_DIR/mood_music_dataset/full_songs/41_Banana_Pancakes_Jack_Johnson.mp3" "$TARGET_DIR/songs/samples/"
cp "$SOURCE_DIR/mood_music_dataset/full_songs/61_Break_Stuff_Limp_Bizkit.mp3" "$TARGET_DIR/songs/samples/"

# Create a directory for server scripts
mkdir -p "$TARGET_DIR/server"

# Copy server scripts
echo "Copying server scripts..."
cp "$SOURCE_DIR/flask_server.py" "$TARGET_DIR/server/"
cp "$SOURCE_DIR/main.py" "$TARGET_DIR/server/"

echo "Done! Files copied to $TARGET_DIR"
echo ""
echo "To use the ML models, either:"
echo "1. Use the Flask server approach by running the server script on your computer:"
echo "   python $TARGET_DIR/server/flask_server.py"
echo ""
echo "2. Configure the ML API endpoint in the MoodBeats app settings to point to your computer's IP"
echo "   For example: http://192.168.1.123:5000/api"
echo ""
echo "NOTE: For the Flask server to work, make sure your computer and phone are on the same WiFi network"
