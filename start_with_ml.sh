#!/bin/bash

# Making this script executable
chmod +x "$0"
echo "✅ Made script executable"

# Display important information about dependencies
echo "⚠️  Important: This app requires react-native-paper which is not installed"
echo "🔍 Checking if react-native-paper is installed..."

if grep -q "react-native-paper" /Users/adarshamit1001/Desktop/MoodBeats_fixed/package.json; then
  echo "✅ react-native-paper is installed. Good to go!"
else
  echo "❌ react-native-paper is not installed."
  echo "⚙️  We've modified the app to work without react-native-paper."
  echo "📝 If you experience any UI issues, you can install it with:"
  echo "   npm install react-native-paper"
  echo ""
  echo "🔄 Continuing with modified UI..."
fi

# Start MoodBeats with ML server integration

# Start the Flask server in the background
echo "🎵 Starting MoodBeats ML Server..."
cd /Users/adarshamit1001/Downloads/music
sh run_server.sh &
SERVER_PID=$!

# Wait for Flask server to start
echo "⏳ Waiting for Flask server to start..."
sleep 5

# Check if API is available
echo "🔍 Testing API connection..."

# Try to connect to the API health endpoint - using a more reliable approach
API_AVAILABLE=false
if curl -s http://192.168.29.142:5000/api/health > /dev/null 2>&1; then
  echo "✅ API is available and responding!"
  API_AVAILABLE=true
else
  echo "⚠️  Warning: API is not responding properly"
  echo "   - The app will still run but the ML features might not work"
  echo "   - Check the Flask server logs for errors"
  echo "   - Make sure you have all required Python packages installed"
  echo "   - Try running 'pip3 install flask numpy pandas scikit-learn scipy xgboost joblib flask-cors'"
fi

# Start the MoodBeats app
echo "🚀 Starting MoodBeats app..."
cd /Users/adarshamit1001/Desktop/MoodBeats_fixed
sh start.sh

# When the app is closed, kill the Flask server
kill $SERVER_PID
echo "✅ Server and app shut down"
