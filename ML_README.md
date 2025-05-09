# MoodBeats ML Integration

This document explains how to use the integrated XGBoost machine learning models for mood prediction in the MoodBeats app.

## Overview

The MoodBeats app can now predict your mood based on heart rate and accelerometer data using two approaches:
1. Simple rule-based prediction (built into the app)
2. Machine learning prediction using XGBoost models (via Flask server)

The ML models provide more accurate mood predictions by analyzing patterns in your biometric data.

## Quick Start

1. Run the integration script to set up the ML models:
   ```bash
   chmod +x integrate_ml_models.sh
   ./integrate_ml_models.sh
   ```

2. Start the app with ML support:
   ```bash
   chmod +x start_with_ml.sh
   ./start_with_ml.sh
   ```

## How It Works

The integration uses a Flask server running on your computer that hosts the XGBoost models. The app connects to this server to get mood predictions and music recommendations.

1. The integration script copies the ML models from your Downloads/music folder to the app's assets directory
2. The Flask server loads these models and exposes an API
3. The app connects to this API to get predictions and recommendations

## Technical Details

### ML Models

Two XGBoost models are used:
- `xgb_emotion_model.pkl`: The primary emotion prediction model
- `xgb_scaler.pkl`: Data scaler for the emotion model
- `xgb_emotion_model2.pkl`: Secondary emotion prediction model for ensemble predictions
- `xgb_scaler2.pkl`: Data scaler for the secondary model

### API Endpoints

The Flask server exposes the following endpoints:
- `/api/health`: Check if the server is running and models are loaded
- `/api/predict-mood`: Predict mood based on heart rate and accelerometer data
- `/api/recommend-songs`: Get song recommendations for a specific mood
- `/api/song-details/<id>`: Get details for a specific song

### Files

The integration adds or modifies the following files:
- `assets/ml/models/`: Contains the ML models
- `assets/ml/server/flask_server.py`: The Flask server that hosts the models
- `assets/ml/server/run_server.sh`: Script to start the Flask server
- `src/services/MLModelService.ts`: Service to interact with the ML server
- `src/services/EnhancedMoodPredictionService.ts`: Updated to use MLModelService

## Troubleshooting

If you encounter issues:

1. Check if the Flask server is running:
   ```bash
   curl http://localhost:5000/api/health
   ```

2. If the app can't connect to the server:
   - Make sure the Flask server is running
   - Check the API URL in the app (Settings -> ML Settings)
   - Try setting the API URL to your computer's IP address
   - For iOS simulators, use `localhost:5000`
   - For Android emulators, use `10.0.2.2:5000`
   - For real devices, use your computer's IP address (e.g., `192.168.1.123:5000`)

3. If models don't load:
   - Check if the models were copied correctly to `assets/ml/models/`
   - Try running the integration script again

4. Reset the app settings:
   - Go to Settings -> Reset All Settings
   - Restart the app and try again

## Custom Development

If you want to modify the ML integration:

1. The Flask server is in `assets/ml/server/flask_server.py`
2. The ML service is in `src/services/MLModelService.ts`
3. The mood prediction service is in `src/services/EnhancedMoodPredictionService.ts`

You can modify these files to change how the ML models are used in the app.
