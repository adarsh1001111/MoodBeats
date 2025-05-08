import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as Crypto from 'expo-crypto';
import base64 from 'react-native-base64';

// Constants for Fitbit OAuth
const CLIENT_ID = '23Q9HX';
const CLIENT_SECRET = 'e16ec0a44d44f6ae44be87ee88fa3996';

// Use the exact redirect URI from Fitbit dashboard
const REDIRECT_URI = 'https://moodbeats.netlify.app/';

// Storage keys
const API_TOKEN_STORAGE_KEY = 'fitbit_api_token';
const DEVICE_STORAGE_KEY = 'connected_fitbit_device';

// Token interface
export interface ApiToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  userId?: string;
  scope?: string;
}

// Device interface
export interface FitbitDevice {
  id: string;
  name: string;
  batteryLevel?: number;
  model?: string;
}

/**
 * Simplified Fitbit Authorization Service
 * Uses Implicit Flow for authentication
 */
class FitbitAuthService {
  // Track initialization status
  private static isInitialized = false;
  
  /**
   * Initialize auth service
   */
  static init() {
    if (this.isInitialized) {
      return;
    }
    
    console.log('Initialized Fitbit Auth Service');
    console.log('Using redirect URI:', REDIRECT_URI);
    
    // Set up linking subscription for deep linking
    Linking.addEventListener('url', this.handleUrl);
    
    this.isInitialized = true;
  }
  
  /**
   * Handle URL event for deep linking
   */
  static async handleUrl(event: { url: string }) {
    console.log('Deep link received:', event.url);
    
    try {
      // Process the URL to extract tokens
      const success = await FitbitAuthService.handleAuthorizationCallback(event.url);
      console.log('Authorization callback handled successfully:', success);
      
      // If we have a global navigation reference, redirect to home on success
      if (success && global.navigation) {
        console.log('Redirecting to home screen after successful auth');
        setTimeout(() => {
          global.navigation.reset({
            index: 0,
            routes: [{ name: 'Home' }],
          });
        }, 1000);
      }
    } catch (error) {
      console.error('Error handling URL:', error);
    }
  }
  
  /**
   * Start authorization process
   */
  static async authorize(): Promise<boolean> {
    try {
      console.log('Starting Fitbit authorization with Implicit flow');
      
      // Get the authorization URL
      const authUrl = `https://www.fitbit.com/oauth2/authorize?response_type=token&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent('heartrate activity profile settings sleep')}&expires_in=31536000`;
      
      console.log('Opening auth URL:', authUrl);
      
      // Open the authorization URL in a browser
      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        Linking.createURL('/'),
        {
          showInRecents: true,
          enableDefaultShareMenu: false
        }
      );
      
      console.log('WebBrowser result type:', result.type);
      console.log('WebBrowser result URL:', result.url || 'No URL returned');
      
      if (result.type === 'success' && result.url) {
        // Process the URL to extract tokens
        return await this.handleAuthorizationCallback(result.url);
      } else {
        console.log('Browser was dismissed without successful auth');
        return false;
      }
    } catch (error) {
      console.error('Error authorizing with Fitbit:', error);
      return false;
    }
  }
  
  /**
   * Handle the authorization callback URL
   */
  static async handleAuthorizationCallback(url: string): Promise<boolean> {
    try {
      console.log('Handling callback URL:', url);
      
      // Extract the access token from the URL
      const accessTokenMatch = url.match(/access_token=([^&#]+)/);
      if (!accessTokenMatch || !accessTokenMatch[1]) {
        console.error('No access token found in URL');
        return false;
      }
      
      const accessToken = accessTokenMatch[1];
      const expiresInMatch = url.match(/expires_in=([^&#]+)/);
      const expiresIn = expiresInMatch ? expiresInMatch[1] : '31536000';
      const userIdMatch = url.match(/user_id=([^&#]+)/);
      const userId = userIdMatch ? userIdMatch[1] : undefined;
      const scopeMatch = url.match(/scope=([^&#]+)/);
      const scope = scopeMatch ? decodeURIComponent(scopeMatch[1]) : undefined;
      
      // Store token directly
      const tokenData: ApiToken = {
        accessToken: accessToken,
        refreshToken: '', // No refresh token in implicit grant
        expiresAt: Date.now() + (parseInt(expiresIn) * 1000),
        userId: userId,
        scope: scope
      };
      
      console.log('Storing token data - Expires at:', new Date(tokenData.expiresAt).toISOString());
      await AsyncStorage.setItem(API_TOKEN_STORAGE_KEY, JSON.stringify(tokenData));
      
      // Get user profile to store as "device"
      await this._getUserProfile();
      return true;
    } catch (error) {
      console.error('Error handling authorization callback:', error);
      return false;
    }
  }
  
  /**
   * Get user profile from Fitbit
   */
  static async _getUserProfile(): Promise<void> {
    try {
      console.log('Getting user profile from Fitbit API');
      
      const tokenJson = await AsyncStorage.getItem(API_TOKEN_STORAGE_KEY);
      if (!tokenJson) {
        throw new Error('No access token available');
      }
      
      const token: ApiToken = JSON.parse(tokenJson);
      
      const response = await fetch('https://api.fitbit.com/1/user/-/profile.json', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token.accessToken}`,
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.error('Profile request failed:', response.status, response.statusText);
        throw new Error(`Failed to get user profile: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Received user profile - User ID:', data.user.encodedId);
      
      // Create a device-like object from the user profile
      const device: FitbitDevice = {
        id: data.user.encodedId,
        name: `${data.user.firstName}'s Fitbit`,
        batteryLevel: 100 // Not available in profile, default to 100%
      };
      
      console.log('Storing device info:', device);
      await AsyncStorage.setItem(DEVICE_STORAGE_KEY, JSON.stringify(device));
    } catch (error) {
      console.error('Error getting user profile:', error);
    }
  }
  
  /**
   * Validate a token by making a test API call
   * @param token The access token to validate
   * @returns True if the token is valid
   */
  static async validateToken(token: string): Promise<boolean> {
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
      }
      
      return true;
    } catch (error) {
      console.error('Error validating token:', error);
      return false;
    }
  }
  
  /**
   * Check if we have valid API tokens
   */
  static async hasValidTokens(): Promise<boolean> {
    try {
      const tokenJson = await AsyncStorage.getItem(API_TOKEN_STORAGE_KEY);
      if (!tokenJson) {
        console.log('No token found in storage');
        return false;
      }
      
      const token: ApiToken = JSON.parse(tokenJson);
      const now = Date.now();
      
      // Check if token is expired
      if (token.expiresAt < now) {
        console.log('Token has expired:', new Date(token.expiresAt).toISOString());
        return false;
      }
      
      console.log('Valid token found, expires:', new Date(token.expiresAt).toISOString());
      return true;
    } catch (error) {
      console.error('Error checking tokens:', error);
      return false;
    }
  }
  
  /**
   * Check if currently connected/authorized
   */
  static async isConnected(): Promise<boolean> {
    return await this.hasValidTokens();
  }
  
  /**
   * Get connected device info
   */
  static async getConnectedDevice(): Promise<FitbitDevice | null> {
    try {
      const deviceJson = await AsyncStorage.getItem(DEVICE_STORAGE_KEY);
      if (deviceJson) {
        const device = JSON.parse(deviceJson);
        console.log('Retrieved device from storage:', device);
        return device;
      }
      
      console.log('No device found in storage, checking for valid tokens');
      
      // Try to get user profile if we have tokens but no device
      if (await this.hasValidTokens()) {
        console.log('Valid tokens found, getting user profile');
        await this._getUserProfile();
        
        const updatedDeviceJson = await AsyncStorage.getItem(DEVICE_STORAGE_KEY);
        if (updatedDeviceJson) {
          const device = JSON.parse(updatedDeviceJson);
          console.log('Retrieved device after profile update:', device);
          return device;
        }
      }
      
      console.log('No device found after profile update');
    } catch (error) {
      console.error('Error getting connected device:', error);
    }
    
    return null;
  }
  
  /**
   * Get heart rate from Fitbit API
   */
  static async getHeartRate(): Promise<{value: number, deviceTime?: string} | null> {
    try {
      console.log('Getting heart rate from Fitbit API');
      
      const tokenJson = await AsyncStorage.getItem(API_TOKEN_STORAGE_KEY);
      if (!tokenJson) {
        console.log('No access token available');
        throw new Error('No access token available');
      }
      
      const token: ApiToken = JSON.parse(tokenJson);
      
      // Get today's date in the format YYYY-MM-DD
      const today = new Date().toISOString().split('T')[0];
      console.log('Getting heart rate data for date:', today);
      
      // Call Fitbit API
      const response = await fetch(
        `https://api.fitbit.com/1/user/-/activities/heart/date/${today}/1d.json`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token.accessToken}`,
            'Accept': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        console.error('Heart rate request failed:', response.status, response.statusText);
        throw new Error(`Failed to get heart rate data: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Received heart rate data');
      
      // Check if there are heart rate zones or resting heart rate
      if (data['activities-heart'] && 
          data['activities-heart'].length > 0 && 
          data['activities-heart'][0].value) {
        
        // Use resting heart rate if available
        if (data['activities-heart'][0].value.restingHeartRate) {
          const restingHeartRate = data['activities-heart'][0].value.restingHeartRate;
          console.log('Using resting heart rate:', restingHeartRate);
          return {
            value: restingHeartRate,
            deviceTime: '12:00:00' // Use noon as an approximation for resting heart rate
          };
        }
        
        // If no resting heart rate, estimate from zones if available
        if (data['activities-heart'][0].value.heartRateZones) {
          const zones = data['activities-heart'][0].value.heartRateZones;
          if (zones.length > 0) {
            // Use the average of min/max of the lowest zone as a rough estimate
            const lowestZone = zones[0];
            const estimatedHeartRate = Math.floor((lowestZone.min + lowestZone.max) / 2);
            console.log('Estimated heart rate from zones:', estimatedHeartRate);
            return {
              value: estimatedHeartRate,
              deviceTime: '12:00:00' // Use noon as an approximation
            };
          }
        }
      }
      
      console.log('No heart rate data available');
      return null;
    } catch (error) {
      console.error('Error getting heart rate from API:', error);
      return null;
    }
  }
  
  /**
   * Revoke authorization
   */
  static async disconnectDevice(): Promise<void> {
    try {
      console.log('Revoking Fitbit authorization');
      
      // Remove stored tokens and device
      await AsyncStorage.removeItem(API_TOKEN_STORAGE_KEY);
      await AsyncStorage.removeItem(DEVICE_STORAGE_KEY);
      
      console.log('Authorization tokens and device info removed');
    } catch (error) {
      console.error('Error revoking authorization:', error);
    }
  }
  
  /**
   * Get device info from Fitbit API
   */
  static async getDeviceInfo(): Promise<{ name: string, batteryLevel: number } | null> {
    try {
      const device = await this.getConnectedDevice();
      if (device) {
        return {
          name: device.name,
          batteryLevel: device.batteryLevel || 100
        };
      }
      
      console.log('No device found, using simulated device info');
      return {
        name: 'Fitbit Device',
        batteryLevel: Math.floor(Math.random() * 100)
      };
    } catch (error) {
      console.error('Error getting device info:', error);
      return null;
    }
  }
  
  /**
   * Save a manually entered token
   */
  static async saveManualToken(accessToken: string, userId?: string): Promise<boolean> {
    try {
      console.log('Saving manually entered token');
      
      // Create a token object
      const tokenData: ApiToken = {
        accessToken: accessToken,
        refreshToken: '', // No refresh token in manual entry
        expiresAt: Date.now() + (31536000 * 1000), // 1 year expiry
        userId: userId
      };
      
      // Validate the token
      const isValid = await this.validateToken(accessToken);
      if (!isValid) {
        console.error('Manual token validation failed');
        return false;
      }
      
      // Store the token
      await AsyncStorage.setItem(API_TOKEN_STORAGE_KEY, JSON.stringify(tokenData));
      
      return true;
    } catch (error) {
      console.error('Error saving manual token:', error);
      return false;
    }
  }
}

export default FitbitAuthService;
