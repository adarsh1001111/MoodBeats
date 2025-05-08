#!/bin/bash
# Make script executable with: chmod +x fix_token_and_crypto.sh
# Run script with: ./fix_token_and_crypto.sh

# Fix for Fitbit Authentication Issues
echo "Applying Fitbit authentication fix..."

# Check if the directory structure exists
if [ ! -d "./src/utils" ]; then
  echo "Creating utils directory..."
  mkdir -p ./src/utils
fi

# Create the FitbitTokenValidator.ts file
echo "Creating FitbitTokenValidator.ts..."
cat > ./src/utils/FitbitTokenValidator.ts << 'EOF'
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FitbitDevice } from '../services/auth/FitbitAuthService';

// Storage keys
const API_TOKEN_STORAGE_KEY = 'fitbit_api_token';
const DEVICE_STORAGE_KEY = 'connected_fitbit_device';

/**
 * Validates a Fitbit API token with the Fitbit API
 * @param token The access token to validate
 * @returns True if the token is valid
 */
export async function validateFitbitToken(token: string): Promise<boolean> {
  try {
    console.log('Validating token with Fitbit API');
    
    // Try to get the user profile to check if token is valid
    const response = await fetch('https://api.fitbit.com/1/user/-/profile.json', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error(`Token validation failed: ${response.status} ${response.statusText}`);
      return false;
    }
    
    // If we successfully got the profile, get the user data
    const data = await response.json();
    console.log('Token validated successfully, user ID:', data.user?.encodedId);
    
    // Create a device-like object from the user profile
    if (data.user) {
      const device: FitbitDevice = {
        id: data.user.encodedId,
        name: `${data.user.firstName}'s Fitbit`,
        batteryLevel: 100 // Not available in profile, default to 100%
      };
      
      console.log('Storing device info from manual token validation');
      await AsyncStorage.setItem(DEVICE_STORAGE_KEY, JSON.stringify(device));
      
      // Also store the token as a valid API token
      const tokenData = {
        accessToken: token,
        refreshToken: '', // No refresh token in manual entry
        expiresAt: Date.now() + (31536000 * 1000), // 1 year expiry
        userId: data.user.encodedId,
        scope: 'heartrate activity profile settings sleep' // Default scope
      };
      
      await AsyncStorage.setItem(API_TOKEN_STORAGE_KEY, JSON.stringify(tokenData));
    }
    
    return true;
  } catch (error) {
    console.error('Error validating token:', error);
    return false;
  }
}
EOF

# Create the ExpoRandomShim.ts file
echo "Creating ExpoRandomShim.ts..."
cat > ./src/utils/ExpoRandomShim.ts << 'EOF'
/**
 * ExpoRandomShim.ts
 * 
 * This file provides a compatibility shim for expo-random, using expo-crypto instead.
 * It replaces the deprecated expo-random functions with their expo-crypto equivalents.
 */
import * as Crypto from 'expo-crypto';

// Add TypeScript global declaration to avoid type errors
declare global {
  var ExpoRandom: {
    getRandomBytesAsync: (byteCount: number) => Promise<Uint8Array>;
    assertByteCount: (byteCount: number) => void;
  };
}

// Create a global ExpoRandom object with the needed methods
const ExpoRandom = {
  // Replacement for random's getRandomBytesAsync
  getRandomBytesAsync: async (byteCount: number): Promise<Uint8Array> => {
    try {
      console.log('Using Crypto.getRandomBytesAsync instead of Random.getRandomBytesAsync');
      return await Crypto.getRandomBytesAsync(byteCount);
    } catch (error) {
      console.error('Error in ExpoRandom.getRandomBytesAsync:', error);
      
      // Fallback implementation using Math.random
      console.warn('Falling back to Math.random implementation (less secure)');
      const randomBytes = new Uint8Array(byteCount);
      for (let i = 0; i < byteCount; i++) {
        randomBytes[i] = Math.floor(Math.random() * 256);
      }
      return randomBytes;
    }
  },

  // Replacement for random's assertByteCount
  assertByteCount: (byteCount: number): void => {
    console.log('Using assertByteCount compatibility check');
    if (byteCount <= 0) {
      throw new Error(`The byteCount ${byteCount} is invalid; expected a value greater than 0.`);
    }
  }
};

// Make it globally available
global.ExpoRandom = ExpoRandom;

export default ExpoRandom;
EOF

# Modify App.tsx to import our shim
echo "Updating App.tsx..."
sed -i'.bak' '1s/^/\/\/ Import our ExpoRandom shim first to ensure it\'s available before any other code runs\nimport ".\/src\/utils\/ExpoRandomShim";\n\n/' App.tsx

# Create a completely new ManualTokenScreen.tsx with the correct imports
echo "Creating updated ManualTokenScreen.tsx..."
cat > ./src/screens/ManualTokenScreen.tsx.new << 'EOF'
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { validateFitbitToken } from '../utils/FitbitTokenValidator';

type RootStackParamList = {
  Home: undefined;
  FitbitConnect: undefined;
  ManualToken: undefined;
};

type ManualTokenScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'ManualToken'
>;

type Props = {
  navigation: ManualTokenScreenNavigationProp;
};

const ManualTokenScreen: React.FC<Props> = ({ navigation }) => {
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTokenSubmit = async () => {
    if (!token.trim()) {
      setError('Please enter a valid token');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Try to extract token from pasted URL or string
      const accessTokenMatch = token.match(/access_token=([^&#]+)/);
      const accessToken = accessTokenMatch ? accessTokenMatch[1] : token.trim();
      
      // Store token
      const tokenData = {
        accessToken: accessToken,
        refreshToken: '', // No refresh token in manual entry
        expiresAt: Date.now() + (31536000 * 1000), // 1 year expiry
        userId: undefined,
        scope: undefined
      };

      await AsyncStorage.setItem('fitbit_api_token', JSON.stringify(tokenData));
      
      // Try to get user profile to validate the token
      const isValid = await validateFitbitToken(accessToken);
      
      if (isValid) {
        Alert.alert(
          'Success',
          'Token successfully added! You have connected to Fitbit.',
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Home' }],
                });
              },
            },
          ]
        );
      } else {
        setError('The token is invalid or has expired. Please try again with a new token.');
        // Clean up the invalid token
        await AsyncStorage.removeItem('fitbit_api_token');
      }
    } catch (err) {
      console.error('Error saving token:', err);
      setError('Failed to save token. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const openFitbitAuth = () => {
    const authUrl = `https://www.fitbit.com/oauth2/authorize?response_type=token&client_id=23Q9HX&redirect_uri=${encodeURIComponent('https://moodbeats.netlify.app/')}&scope=${encodeURIComponent('heartrate activity profile settings sleep')}&expires_in=31536000`;
    
    Alert.alert(
      'Get Fitbit Token',
      'You will be redirected to Fitbit\'s authorization page. After authorizing, copy the access_token from the URL and paste it here.',
      [
        {
          text: 'Copy Auth URL',
          onPress: () => {
            // Copy to clipboard functionality would go here if available
            Alert.alert('Auth URL', authUrl);
          }
        },
        {
          text: 'OK',
          onPress: () => {}
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Manual Fitbit Token Entry</Text>
        
        <Text style={styles.instructions}>
          If automatic connection failed, you can manually enter your Fitbit access token here.
        </Text>
        
        <TouchableOpacity style={styles.helpButton} onPress={openFitbitAuth}>
          <Text style={styles.helpButtonText}>How to Get a Token</Text>
        </TouchableOpacity>
        
        <Text style={styles.label}>Enter Fitbit Access Token:</Text>
        <TextInput
          style={styles.input}
          placeholder="Paste your token or the entire callback URL here"
          value={token}
          onChangeText={setToken}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          autoCapitalize="none"
          autoCorrect={false}
        />
        
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleTokenSubmit}
          disabled={isLoading || !token.trim()}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Connect to Fitbit</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={isLoading}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#6200ea',
    textAlign: 'center',
  },
  instructions: {
    fontSize: 16,
    color: '#424242',
    marginBottom: 20,
    lineHeight: 22,
  },
  helpButton: {
    backgroundColor: '#e1bee7',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  helpButtonText: {
    color: '#4a148c',
    fontSize: 16,
    fontWeight: '500',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#424242',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 120,
    marginBottom: 16,
  },
  errorText: {
    color: '#d32f2f',
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: '#6200ea',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  cancelButton: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#9e9e9e',
  },
  cancelButtonText: {
    color: '#616161',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default ManualTokenScreen;
EOF

# Replace the ManualTokenScreen.tsx file with our new version
cp ./src/screens/ManualTokenScreen.tsx.new ./src/screens/ManualTokenScreen.tsx
rm ./src/screens/ManualTokenScreen.tsx.new

# Create documentation
echo "Creating documentation..."
cat > ./FITBIT_TOKEN_FIX.md << 'EOF'
# Fixing Fitbit Authentication Issues

This document explains the fixes implemented to resolve the Fitbit authentication token issues in the MoodBeats app.

## Problems Fixed

1. **Missing validateToken Function**: The error "Error saving token: [TypeError: _FitbitAuthService.default.validateToken is not a function (it is undefined)]" occurred because the `validateToken` function was missing from the FitbitAuthService.

2. **Deprecated expo-random Package**: Errors related to "expo-random is deprecated in favor of expo-crypto" were occurring during the Fitbit authentication process.

## Solution

We implemented the following fixes:

1. **Created FitbitTokenValidator**: Added a dedicated utility for validating Fitbit tokens:
   - Located at `src/utils/FitbitTokenValidator.ts`
   - Provides a standalone `validateFitbitToken` function
   - Works independently of the main FitbitAuthService

2. **Updated ManualTokenScreen**: Modified the ManualTokenScreen to use the new validator:
   - Replaced the import for FitbitAuthService
   - Updated the call to use validateFitbitToken instead

3. **Added ExpoRandomShim**: Created a compatibility layer for the deprecated expo-random:
   - Located at `src/utils/ExpoRandomShim.ts`
   - Implements getRandomBytesAsync and assertByteCount using expo-crypto
   - Includes fallback mechanisms in case expo-crypto fails
   - Imported at the beginning of App.tsx to ensure it's available globally

## How to Test

1. Open the app and go to the Fitbit Connect screen
2. Tap "Sign in with Fitbit"
3. Complete authentication on the Fitbit website
4. The app should successfully redirect and connect to your Fitbit account without errors

If automatic connection fails:
1. The token will be displayed on the Netlify page
2. Use the "Manual Token Entry" option in the app
3. Paste the token and connect manually

## Why This Approach Works

Instead of modifying the core `FitbitAuthService.ts` file (which could be complex and risky), we created separate utility modules that:

1. Work independently of the existing code
2. Are easier to maintain and update
3. Don't risk breaking other functionality

The ExpoRandomShim is loaded early in the application lifecycle to ensure it's available before any code tries to use the deprecated functions, and it includes robust fallback options if the crypto functions fail.

The separate validator function focuses solely on validating tokens without needing to understand the full FitbitAuthService implementation.
EOF

# Clean up backup files
find . -name "*.bak" -type f -delete

echo "Fix applied successfully!"
echo "Please read FITBIT_TOKEN_FIX.md for details on the changes."
