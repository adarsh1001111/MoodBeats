/**
 * This script clears any invalid or expired Fitbit tokens
 * Run this when encountering 401 Unauthorized errors with the Fitbit API
 */

const { AsyncStorage } = require('@react-native-async-storage/async-storage');

// Storage keys for Fitbit auth data
const API_TOKEN_STORAGE_KEY = 'fitbit_api_token';
const DEVICE_STORAGE_KEY = 'connected_fitbit_device';
const CODE_VERIFIER_STORAGE_KEY = 'fitbit_code_verifier';

/**
 * Clear all Fitbit related tokens and data
 */
const clearTokens = async () => {
  try {
    console.log('Clearing Fitbit authentication data...');
    
    // Remove stored tokens and device info
    await AsyncStorage.removeItem(API_TOKEN_STORAGE_KEY);
    await AsyncStorage.removeItem(DEVICE_STORAGE_KEY);
    await AsyncStorage.removeItem(CODE_VERIFIER_STORAGE_KEY);
    
    console.log('Fitbit tokens and device info cleared successfully');
  } catch (error) {
    console.error('Error clearing tokens:', error);
  }
};

// Export for use in the app
module.exports = {
  clearTokens
};

// Auto-run if executed directly
if (require.main === module) {
  clearTokens().then(() => console.log('Done'));
}
