#!/bin/bash

# Make this script executable
chmod +x "$0"

# Make all other scripts executable
if [ -f "IP_SETUP.sh" ]; then
  chmod +x IP_SETUP.sh
fi

if [ -f "start.sh" ]; then
  chmod +x start.sh
fi

if [ -f "start_with_ml.sh" ]; then
  chmod +x start_with_ml.sh
fi

# Run IP setup to ensure we have the right IP
echo "Setting up IP configuration..."
if [ -f "IP_SETUP.sh" ]; then
  ./IP_SETUP.sh
else
  echo "IP_SETUP.sh not found. Skipping IP configuration."
fi

# Start ML server in the background
echo "Starting ML server in the background..."
if [ -f "start_with_ml.sh" ]; then
  ./start_with_ml.sh &
  # Wait a moment for the ML server to initialize
  sleep 2
  echo "ML server started."
else
  echo "start_with_ml.sh not found. Skipping ML server."
fi

# Start the main app
echo "Starting the main app..."
if [ -f "start.sh" ]; then
  ./start.sh
else
  # Fallback to direct Expo start
  echo "start.sh not found. Starting with npx expo start."
  npx expo start
fi
