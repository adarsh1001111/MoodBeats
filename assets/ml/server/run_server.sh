#!/bin/bash

# Making this script executable
chmod +x "$0"
echo "✅ Made script executable"

# Script to start the MoodBeats Flask server
echo "🎵 Starting MoodBeats Flask Server"
echo "==============================="

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3 and try again."
    exit 1
fi

# Set the current directory to script location
cd "$(dirname "$0")"

# Install required packages
echo "📦 Installing required packages..."
pip3 install flask numpy pandas scikit-learn scipy xgboost joblib flask-cors

# Run the Flask server
echo "🚀 Starting Flask server..."
python3 flask_server.py
