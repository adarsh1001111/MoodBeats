#!/bin/bash

# Making this script executable
chmod +x "$0"
echo "✅ Made script executable"

# Display information about ML model integration
echo "🎵 MoodBeats ML Model Integration Script"
echo "========================================"
echo ""

# Step 1: Check for required Python packages
echo "Step 1: Checking Python installation and required packages"
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3 and try again."
    exit 1
else
    echo "✅ Python 3 is installed"
fi

# Check pip installation
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 is not installed. Please install pip3 and try again."
    exit 1
else
    echo "✅ pip3 is installed"
fi

# Step 2: Create necessary directories
echo ""
echo "Step 2: Creating necessary directories"
mkdir -p "/Users/adarshamit1001/Desktop/MoodBeats_fixed/assets/ml/models"
mkdir -p "/Users/adarshamit1001/Desktop/MoodBeats_fixed/assets/ml/songs/samples"
echo "✅ Directories created"

# Step 3: Copy ML models from Downloads
echo ""
echo "Step 3: Copying ML models from Downloads/music"
cp "/Users/adarshamit1001/Downloads/music/xgb_emotion_model.pkl" "/Users/adarshamit1001/Desktop/MoodBeats_fixed/assets/ml/models/"
cp "/Users/adarshamit1001/Downloads/music/xgb_scaler.pkl" "/Users/adarshamit1001/Desktop/MoodBeats_fixed/assets/ml/models/"
cp "/Users/adarshamit1001/Downloads/music/xgb_emotion_model2.pkl" "/Users/adarshamit1001/Desktop/MoodBeats_fixed/assets/ml/models/"
cp "/Users/adarshamit1001/Downloads/music/xgb_scaler2.pkl" "/Users/adarshamit1001/Desktop/MoodBeats_fixed/assets/ml/models/"
echo "✅ ML models copied"

# Step 4: Copy song list
echo ""
echo "Step 4: Copying song list"
cp "/Users/adarshamit1001/Downloads/music/indexed_song_list_final.csv" "/Users/adarshamit1001/Desktop/MoodBeats_fixed/assets/ml/"
echo "✅ Song list copied"

# Step 5: Copy sample songs if they exist
echo ""
echo "Step 5: Checking for sample songs"
MUSIC_DIR="/Users/adarshamit1001/Downloads/music/mood_music_dataset/full_songs"
if [ -d "$MUSIC_DIR" ]; then
    echo "Found music directory, copying sample songs..."
    cp "$MUSIC_DIR/01_Happy_Pharrell_Williams.mp3" "/Users/adarshamit1001/Desktop/MoodBeats_fixed/assets/ml/songs/samples/" 2>/dev/null || echo "- Sample song 1 not found"
    cp "$MUSIC_DIR/21_Someone_Like_You_Adele.mp3" "/Users/adarshamit1001/Desktop/MoodBeats_fixed/assets/ml/songs/samples/" 2>/dev/null || echo "- Sample song 2 not found"
    cp "$MUSIC_DIR/41_Banana_Pancakes_Jack_Johnson.mp3" "/Users/adarshamit1001/Desktop/MoodBeats_fixed/assets/ml/songs/samples/" 2>/dev/null || echo "- Sample song 3 not found"
    cp "$MUSIC_DIR/61_Break_Stuff_Limp_Bizkit.mp3" "/Users/adarshamit1001/Desktop/MoodBeats_fixed/assets/ml/songs/samples/" 2>/dev/null || echo "- Sample song 4 not found"
    echo "✅ Sample songs copied (if available)"
else
    echo "⚠️ Music directory not found. Sample songs will not be available."
fi

# Step 6: Make server script executable
echo ""
echo "Step 6: Making server script executable"
chmod +x "/Users/adarshamit1001/Desktop/MoodBeats_fixed/assets/ml/server/run_server.sh"
echo "✅ Server script is now executable"

# Step 7: Install required Python packages
echo ""
echo "Step 7: Installing required Python packages"
pip3 install flask numpy pandas scikit-learn scipy xgboost joblib flask-cors
echo "✅ Python packages installed"

echo ""
echo "🎉 ML model integration complete!"
echo ""
echo "To use the ML models with MoodBeats:"
echo "1. Run the ML server: /Users/adarshamit1001/Desktop/MoodBeats_fixed/assets/ml/server/run_server.sh"
echo "2. Start the MoodBeats app: /Users/adarshamit1001/Desktop/MoodBeats_fixed/start.sh"
echo "3. In the app, go to Settings and select 'AI Model' for mood prediction"
echo ""
echo "Or simply use the start_with_ml.sh script to start both at once:"
echo "chmod +x /Users/adarshamit1001/Desktop/MoodBeats_fixed/start_with_ml.sh"
echo "./start_with_ml.sh"
echo ""
