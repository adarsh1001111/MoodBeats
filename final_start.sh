#!/bin/bash

echo "🚀 Starting MoodBeats App - Fixed Edition"
echo "----------------------------------------"

# Make all scripts executable
echo "Making all scripts executable..."
chmod +x *.sh
echo "✅ Done"

# Run IP setup to ensure we have the right IP
echo "Setting up IP configuration..."
./IP_SETUP.sh
echo "✅ Done"

# Start ML server in the background
echo "Starting ML server in the background..."
./start_with_ml.sh &

# Wait a moment for the ML server to initialize
sleep 3
echo "✅ ML server started"

# Start the main app
echo "Starting the main app..."
npx expo start
