# Setting Up MoodBeats for Mobile Devices

This guide will help you set up the MoodBeats app to work with Expo Go on your mobile device.

## Connection Requirements

For the app to work properly on your mobile device with ML features enabled:

1. Your laptop and phone must be on the same WiFi network
2. The Flask server (ML backend) must use your laptop's actual IP address
3. The server port (5000) must not be blocked by firewalls

## Setup Instructions

### Step 1: Update API URLs

Run the provided setup script to automatically configure the correct IP address:

```bash
# Make the script executable
chmod +x IP_SETUP.sh

# Run the script
./IP_SETUP.sh
```

The script will:
- Find your laptop's IP address
- Update all necessary files with this IP
- Prepare the app to communicate properly on your network

### Step 2: Start the Server and App

After updating the IP addresses, start the application:

```bash
# Run the start script
./start_with_ml.sh
```

### Step 3: Connect with Expo Go

1. Install Expo Go on your mobile device if you haven't already
2. Scan the QR code with the Expo Go app
3. The app should load on your device and be able to communicate with the ML server

## Troubleshooting

If you encounter connection issues:

1. **Verify network connection**: Ensure both devices are on the same WiFi network

2. **Check the server**: Verify the Flask server is running by opening a web browser on your laptop and navigating to:
   ```
   http://YOUR_LAPTOP_IP:5000/api/health
   ```
   You should see a response with `{"status": "ok", ...}`

3. **Test from your phone**: Open a web browser on your phone and try accessing:
   ```
   http://YOUR_LAPTOP_IP:5000/api/health
   ```
   If this doesn't work, there might be network/firewall issues

4. **Check firewall settings**: Make sure your laptop's firewall allows connections on port 5000

5. **Manually update IP**: If the script didn't work, manually edit the files:
   - `src/services/EnhancedMoodPredictionService.ts`
   - `src/components/MoodAnalytics.tsx`
   - `src/utils/testMLModels.ts`
   
   Replace all instances of `localhost`, `127.0.0.1`, or `YOUR_LAPTOP_IP` with your actual IP address.

## Using the App on Mobile

Once everything is set up:

1. Go to Settings in the app
2. In the "Mood Prediction" section, turn on "Use AI Model"
3. Return to the home screen and use the MoodAnalytics component
4. The app will collect heart rate and accelerometer data from your device
5. The ML server on your laptop will process this data and return mood predictions

The app will automatically fall back to basic mode if the ML server can't be reached.
