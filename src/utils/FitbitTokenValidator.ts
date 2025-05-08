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
