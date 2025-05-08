# MoodBeats ML Integration

This document explains how to use the XGBoost machine learning models for mood prediction with the MoodBeats app.

## Overview

The MoodBeats app can predict your mood based on heart rate and accelerometer data using two approaches:
1. Simple rule-based prediction (built into the app)
2. Machine learning prediction using XGBoost models (via Flask server)

The ML models provide more accurate mood predictions by analyzing patterns in your biometric data.

## Getting Started

### Prerequisites
- Python 3.6 or higher
- Node.js and npm
- Required Python packages (will be installed automatically):
  - flask
  - numpy
  - pandas
  - scikit-learn
  - scipy
  - xgboost
  - joblib
  - flask-cors

### Running the App with ML Integration

1. Use the provided startup script:
   ```bash
   chmod +x start_with_ml.sh
   ./start_with_ml.sh
   ```

   This script will:
   - Start the Flask server with ML models
   - Launch the MoodBeats app
   - Connect them automatically

2. Alternatively, you can start them separately:
   - Start the ML server:
     ```bash
     cd /Users/adarshamit1001/Downloads/music
     sh run_server.sh
     ```
   - Start the MoodBeats app:
     ```bash
     cd /Users/adarshamit1001/Desktop/MoodBeats_fixed
     sh start.sh
     ```

## Enabling ML-based Mood Prediction

1. In the app, go to Settings
2. In the "Mood Prediction" section, select "AI Model"
3. The app will automatically check if the ML server is available
4. If connected successfully, you'll see "Using AI model for mood prediction"

## How It Works

1. The app collects your heart rate data and accelerometer readings
2. This data is sent to the Flask server running the XGBoost models
3. The models extract statistical features from the data
4. Two XGBoost models make predictions independently
5. The predictions are combined to determine your current mood
6. Music recommendations are generated based on the predicted mood

## Troubleshooting

If you encounter issues:

1. Check that the Flask server is running:
   ```bash
   curl http://localhost:5000/api/health
   ```

2. **Network connection**: The React Native app running in Expo may have difficulty connecting to the ML server. Try these solutions:
   - Change the IP addresses in the app to match your actual network IP (not just localhost)
   - If running on a real device, make sure it's on the same network as your computer
   - For iOS simulators and Android emulators, 10.0.2.2 often works better than localhost
   - Configure port forwarding in your development environment

3. If the app can't connect to the server, try:
   - Restarting both the server and app
   - Checking for firewall or network issues
   - Ensuring the correct API_URL in EnhancedMoodPredictionService.ts

## Technical Details

- The ML models were trained on biometric data to recognize patterns associated with different emotional states
- Four mood categories are supported: Happy, Sad, Angry, and Relaxed
- Features extracted include statistical measures of heart rate and movement patterns
- The system uses ensemble learning by combining predictions from two separate models
