#!/bin/bash

# Make this script executable
chmod +x "$0"

# Make the script executable
chmod +x IP_SETUP.sh
chmod +x start.sh
chmod +x start_with_ml.sh

# Run IP setup to ensure we have the right IP
echo "Setting up IP configuration..."
./IP_SETUP.sh

# Start ML server in the background
echo "Starting ML server in the background..."
./start_with_ml.sh &

# Wait a moment for the ML server to initialize
sleep 2

# Start the main app
echo "Starting the main app..."
./start.sh
