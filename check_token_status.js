/**
 * This script checks the status of Fitbit tokens
 * Use this to diagnose authentication issues
 */

const { AsyncStorage } = require('@react-native-async-storage/async-storage');
const fetch = require('node-fetch');

// Storage keys for Fitbit auth data
const API_TOKEN_STORAGE_KEY = 'fitbit_api_token';
const DEVICE_STORAGE_KEY = 'connected_fitbit_device';

/**
 * Check token validity with Fitbit API
 */
const checkTokenStatus = async () => {
  try {
    console.log('Checking Fitbit token status...');
    
    // Retrieve the stored token
    const tokenJson = await AsyncStorage.getItem(API_TOKEN_STORAGE_KEY);
    if (!tokenJson) {
      console.log('No token found in storage');
      return;
    }
    
    const token = JSON.parse(tokenJson);
    const now = Date.now();
    
    console.log('Token details:');
    console.log('- Access token exists:', !!token.accessToken);
    console.log('- Refresh token exists:', !!token.refreshToken);
    console.log('- Expires at:', new Date(token.expiresAt).toISOString());
    console.log('- Is expired:', token.expiresAt < now);
    console.log('- Time until expiry:', Math.floor((token.expiresAt - now) / 1000 / 60), 'minutes');
    
    // Try to verify the token with Fitbit API
    try {
      const response = await fetch('https://api.fitbit.com/1/user/-/profile.json', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token.accessToken}`
        }
      });
      
      console.log('API test response status:', response.status);
      
      if (response.ok) {
        console.log('Token is valid and working correctly');
      } else if (response.status === 401) {
        console.log('Token is invalid or expired');
        console.log('Try running clear_invalid_tokens.js and re-authenticating');
      } else {
        console.log('Unexpected API response:', response.statusText);
      }
    } catch (apiError) {
      console.error('Error testing token with API:', apiError);
    }
    
    // Check for device info
    const deviceJson = await AsyncStorage.getItem(DEVICE_STORAGE_KEY);
    if (deviceJson) {
      const device = JSON.parse(deviceJson);
      console.log('Device info:');
      console.log('- ID:', device.id);
      console.log('- Name:', device.name);
      console.log('- Battery level:', device.batteryLevel);
      console.log('- Model:', device.model || 'Unknown');
    } else {
      console.log('No device info found in storage');
    }
  } catch (error) {
    console.error('Error checking token status:', error);
  }
};

// Export for use in the app
module.exports = {
  checkTokenStatus
};

// Auto-run if executed directly
if (require.main === module) {
  checkTokenStatus().then(() => console.log('Done'));
}
