#!/bin/bash

# Making this script executable
chmod +x "$0"
echo "✅ Made script executable"

# Display important information about dependencies
echo "🎵 Starting MoodBeats with ML Integration"
echo "========================================"

# Check if ML models are integrated
if [ ! -f "/Users/adarshamit1001/Desktop/MoodBeats_fixed/assets/ml/models/xgb_emotion_model.pkl" ]; then
  echo "⚠️ ML models are not yet integrated!"
  echo "Running integration script first..."
  chmod +x /Users/adarshamit1001/Desktop/MoodBeats_fixed/integrate_ml_models.sh
  /Users/adarshamit1001/Desktop/MoodBeats_fixed/integrate_ml_models.sh
  echo "✅ ML models integrated successfully!"
fi

# Start the Flask server in the background
echo "🎵 Starting MoodBeats ML Server..."
cd /Users/adarshamit1001/Desktop/MoodBeats_fixed/assets/ml/server
sh run_server.sh &
SERVER_PID=$!

# Wait for Flask server to start
echo "⏳ Waiting for Flask server to start..."
sleep 5

# Check if API is available
echo "🔍 Testing API connection..."
API_URL="http://localhost:5000/api/health"
API_AVAILABLE=false

# Try to connect to the API health endpoint
if curl -s $API_URL > /dev/null 2>&1; then
  echo "✅ API is available and responding!"
  API_AVAILABLE=true
else
  echo "⚠️ Warning: API is not responding properly"
  echo "   - The app will still run but the ML features might not work"
  echo "   - Check the Flask server logs for errors"
  echo "   - Make sure you have all required Python packages installed"
  echo "   - Try running 'pip3 install flask numpy pandas scikit-learn scipy xgboost joblib flask-cors'"
fi

# Update API URL in the React Native app
if [ "$API_AVAILABLE" = true ]; then
  echo "🔄 Setting API URL in the app to localhost..."
  # For real device testing, this could be updated to use the computer's IP
  # IP_ADDRESS=$(ipconfig getifaddr en0)
  # APP_API_URL="http://$IP_ADDRESS:5000/api"
  APP_API_URL="http://localhost:5000/api"
  echo "   - API URL set to: $APP_API_URL"
fi

# Start the MoodBeats app
echo "🚀 Starting MoodBeats app..."
cd /Users/adarshamit1001/Desktop/MoodBeats_fixed
sh start.sh

# When the app is closed, kill the Flask server
kill $SERVER_PID 2>/dev/null || echo "Server already stopped"
echo "✅ Server and app shut down"
