#!/bin/bash

echo "🛠️ MoodBeats Complete Fix Script"
echo "--------------------------------"

# Make this script executable
chmod +x "$0"

# Make all scripts executable
echo "Making all scripts executable..."
chmod +x *.sh
echo "✅ Done"

# Clear AsyncStorage to remove any invalid tokens
echo "Creating script to clear invalid tokens..."
cat > ./clear_invalid_tokens.js << EOL
// Script to clear any invalid tokens from AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';

async function clearInvalidTokens() {
  try {
    // Keys to clear for a fresh start
    const keys = [
      'fitbit_api_token',
      'fitbit_connection_status',
      'fitbit_connected_device'
    ];
    
    // Remove all keys
    await AsyncStorage.multiRemove(keys);
    console.log('All Fitbit tokens and connection data cleared!');
  } catch (error) {
    console.error('Error clearing tokens:', error);
  }
}

clearInvalidTokens();
EOL
echo "✅ Done"

# Run IP setup to ensure we have the right IP
echo "Setting up IP configuration..."
./IP_SETUP.sh
echo "✅ Done"

# Create info file with helpful instructions
echo "Creating help document..."
cat > ./FITBIT_TOKEN_HELP.md << EOL
# Fitbit Token Help

If you're experiencing issues with your Fitbit connection, follow these steps:

1. **Clear Invalid Tokens**:
   - Go to Settings → Advanced → Clear Tokens
   - This will remove any expired or invalid tokens

2. **Reconnect Your Fitbit**:
   - Go to the Connect screen
   - Tap "Sign in with Fitbit"
   - Follow the authentication process

3. **If Authorization Fails**:
   - Try the manual token option
   - You can get a token from [Fitbit Developer Site](https://dev.fitbit.com/apps/oauth2/redirect)

4. **Check Connection Status**:
   - The connection screen will show if your token is valid or invalid
   - If it shows "Connection Error", follow the disconnect and reconnect steps

5. **Force Restart the App**:
   - If all else fails, completely close and restart the app
EOL
echo "✅ Done"

# Start ML server in the background
echo "Starting ML server in the background..."
./start_with_ml.sh &

# Wait a moment for the ML server to initialize
sleep 3
echo "✅ ML server started"

# Start the main app
echo "Starting the main app..."
echo "NOTE: If you see Fitbit connection errors, use the disconnect and reconnect option"
echo "      which can be found on the Fitbit connection screen."
npx expo start
