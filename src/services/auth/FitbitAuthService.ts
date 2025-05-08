import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as Crypto from 'expo-crypto';
import base64 from 'react-native-base64';

// Constants for Fitbit OAuth
const CLIENT_ID = '23Q9HX';
const CLIENT_SECRET = 'e16ec0a44d44f6ae44be87ee88fa3996';

// Use the correct Netlify site URL that matches your Fitbit dashboard (with trailing slash)
const REDIRECT_URI = 'https://moodbeats.netlify.app/';

// Storage keys
const API_TOKEN_STORAGE_KEY = 'fitbit_api_token';
const DEVICE_STORAGE_KEY = 'connected_fitbit_device';
const CODE_VERIFIER_STORAGE_KEY = 'fitbit_code_verifier';

// Auth flow types
const AUTH_FLOW_IMPLICIT = 'implicit';
const AUTH_FLOW_CODE_PKCE = 'authorization_code_pkce';

// Token interface
export interface ApiToken {
  accessToken: string;
  refreshToken?: string; // Made optional for implicit flow
  expiresAt: number;
  userId?: string;
  scope?: string;
}

// Device interface
export interface FitbitDevice {
  id: string;
  name: string;
  batteryLevel?: number;
  model?: string; // Added model field to store device type
}

/**
 * Fitbit Authorization Service
 * Handles OAuth 2.0 flows for Fitbit API
 */
class FitbitAuthService {
  // Track current auth flow
  private static currentAuthFlow = AUTH_FLOW_IMPLICIT;
  private static isInitialized = false;
  
  /**
   * Initialize auth service
   */
  static async init() {
    if (this.isInitialized) {
      return;
    }
    
    console.log('Initialized Fitbit Auth Service');
    console.log('Using redirect URI:', REDIRECT_URI);
    console.log('Client ID:', CLIENT_ID);
    
    // Set up linking subscription for deep linking
    Linking.addEventListener('url', this.handleUrl);
    
    this.isInitialized = true;
    
    // Check if we have existing tokens that need validation
    this.validateExistingToken();
  }
  
  /**
   * Validate any existing token in storage
   */
  static async validateExistingToken() {
    try {
      const tokenJson = await AsyncStorage.getItem(API_TOKEN_STORAGE_KEY);
      if (!tokenJson) return;
      
      const token: ApiToken = JSON.parse(tokenJson);
      console.log('Found existing token, checking validity');
      console.log('Token expires at:', new Date(token.expiresAt).toISOString());
      console.log('Token scopes:', token.scope || 'none specified');
      
      // Check if token is close to expiry
      const now = Date.now();
      const tenMinutesInMs = 10 * 60 * 1000;
      if (token.expiresAt - now < tenMinutesInMs) {
        console.log('Token expires soon, attempting refresh');
        await this.refreshAccessToken();
      }
      
      // Validate token with a test API call
      try {
        const testResponse = await fetch('https://api.fitbit.com/1/user/-/profile.json', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token.accessToken}`
          }
        });
        
        if (testResponse.ok) {
          console.log('Existing token successfully validated');
        } else {
          console.error('Existing token validation failed:', testResponse.status);
          if (testResponse.status === 401) {
            console.log('Token invalid (401), clearing saved token');
            await AsyncStorage.removeItem(API_TOKEN_STORAGE_KEY);
            await AsyncStorage.removeItem(DEVICE_STORAGE_KEY);
          }
        }
      } catch (error) {
        console.error('Error validating token:', error);
      }
    } catch (error) {
      console.error('Error in validateExistingToken:', error);
    }
  }
  
  /**
   * Handle URL event for deep linking
   */
  static async handleUrl(event: { url: string }) {
    console.log('Deep link received:', event.url);
    
    try {
      // Process the URL to extract tokens or auth code
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
   * Clear all tokens and stored data
   */
  static async clearTokens(): Promise<void> {
    console.log('Clearing all stored tokens and data');
    await AsyncStorage.removeItem(API_TOKEN_STORAGE_KEY);
    await AsyncStorage.removeItem(DEVICE_STORAGE_KEY);
    await AsyncStorage.removeItem(CODE_VERIFIER_STORAGE_KEY);
  }
  
  /**
   * Start authorization process
   * @param flowType Optional flow type, defaults to 'implicit'
   */
  static async authorize(flowType = AUTH_FLOW_IMPLICIT): Promise<boolean> {
    try {
      console.log('Starting Fitbit authorization with flow:', flowType);
      this.currentAuthFlow = flowType;
      
      // Clear any existing tokens first
      await this.clearTokens();
      
      // Get the authorization URL for the selected flow type
      const authUrl = await this._getAuthorizationUrl(flowType);
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
        // Process the URL to extract tokens or auth code
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
   * Generate a code verifier for PKCE
   * @returns string A random string between 43-128 characters
   */
  static async _generateCodeVerifier(): Promise<string> {
    try {
      // Generate random bytes using expo-crypto directly
      const randomBytes = await Crypto.getRandomBytesAsync(32);
      
      // Convert to base64 and make URL safe
      const base64String = base64.encodeFromByteArray(randomBytes);
      const codeVerifier = base64String
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
      
      // Store the code verifier for later use
      await AsyncStorage.setItem(CODE_VERIFIER_STORAGE_KEY, codeVerifier);
      
      return codeVerifier;
    } catch (error) {
      console.error('Error generating code verifier:', error);
      
      // Fallback method if crypto fails
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
      let result = '';
      const randomValues = new Uint8Array(43);
      
      // Use Math.random as a last resort
      for (let i = 0; i < 43; i++) {
        randomValues[i] = Math.floor(Math.random() * 256);
      }
      
      for (let i = 0; i < 43; i++) {
        result += chars.charAt(randomValues[i] % chars.length);
      }
      
      // Store the fallback code verifier
      await AsyncStorage.setItem(CODE_VERIFIER_STORAGE_KEY, result);
      
      return result;
    }
  }
  
  /**
   * Generate a code challenge from a code verifier
   * @param codeVerifier The code verifier string
   * @returns string Base64URL encoded SHA-256 hash of the code verifier
   */
  static async _generateCodeChallenge(codeVerifier: string): Promise<string> {
    // Hash the code verifier with SHA-256
    const digest = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      codeVerifier
    );
    
    // Convert to base64 and make URL safe
    const base64String = base64.encode(digest);
    return base64String
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }
  
  /**
   * Generate a random state string for OAuth 2.0
   * @returns A random string for state parameter
   */
  static async _generateRandomState(): Promise<string> {
    try {
      // Use expo-crypto to generate random bytes
      const randomBytes = await Crypto.getRandomBytesAsync(16);
      // Convert to a hexadecimal string
      return Array.from(randomBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    } catch (error) {
      console.error('Error generating random state:', error);
      
      // Fallback method using Math.random if crypto fails
      let state = '';
      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      
      for (let i = 0; i < 32; i++) {
        state += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      
      return state;
    }
  }
  
  /**
   * Get the authorization URL for the specified flow type
   */
  static async _getAuthorizationUrl(flowType: string): Promise<string> {
    // Common parameters
    const scopes = encodeURIComponent('heartrate activity profile settings sleep');
    // Generate state using our new method instead of Math.random
    const state = await this._generateRandomState();
    
    // Handle different flow types
    if (flowType === AUTH_FLOW_CODE_PKCE) {
      // Generate PKCE code verifier and challenge
      const codeVerifier = await this._generateCodeVerifier();
      const codeChallenge = await this._generateCodeChallenge(codeVerifier);
      
      // Build authorization URL for PKCE flow
      return `https://www.fitbit.com/oauth2/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${scopes}&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256`;
    } else {
      // Default to implicit flow
      // Generate the authorization URL for implicit flow
      return `https://www.fitbit.com/oauth2/authorize?response_type=token&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${scopes}&state=${state}&expires_in=31536000`;
    }
  }
  
  /**
   * Exchange authorization code for tokens
   * Used in Authorization Code Grant flow
   */
  static async _exchangeCodeForToken(code: string): Promise<boolean> {
    try {
      // Retrieve the stored code verifier
      const codeVerifier = await AsyncStorage.getItem(CODE_VERIFIER_STORAGE_KEY);
      
      if (!codeVerifier) {
        console.error('No code verifier found for token exchange');
        return false;
      }
      
      console.log('Exchanging code for token with code verifier');
      
      // Build the token request
      const tokenUrl = 'https://api.fitbit.com/oauth2/token';
      
      // Properly encode client ID & secret for Basic auth as required by Fitbit
      const credentials = base64.encode(`${CLIENT_ID}:${CLIENT_SECRET}`);
      
      // First, let's log what's being sent for debugging
      console.log('Token request details:');
      console.log('- URL:', tokenUrl);
      console.log('- Auth header:', `Basic ${credentials.substring(0, 5)}...`);
      console.log('- Code verifier length:', codeVerifier.length);
      console.log('- Redirect URI:', REDIRECT_URI);
      
      // Create the request body
      const formData = new URLSearchParams();
      formData.append('client_id', CLIENT_ID);
      formData.append('grant_type', 'authorization_code');
      formData.append('code', code);
      formData.append('redirect_uri', REDIRECT_URI);
      formData.append('code_verifier', codeVerifier);
      
      // Set up headers exactly as Fitbit requires
      const headers = {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      };
      
      console.log('Making token exchange request');
      
      // Make the token request
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: headers,
        body: formData.toString(),
      });
      
      // Log full response for debugging
      console.log('Token exchange response status:', response.status);
      const responseText = await response.text();
      console.log('Token exchange response text:', responseText);
      
      // Check if the request was successful
      if (!response.ok) {
        console.error(`Token exchange failed with status ${response.status}: ${response.statusText}`);
        console.error('Error details:', responseText);
        return false;
      }
      
      // Parse the token response
      let tokenData;
      try {
        tokenData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Error parsing token response:', parseError);
        console.error('Invalid JSON:', responseText);
        return false;
      }
      console.log('Token exchange successful');
      
      if (!tokenData.access_token) {
        console.error('Invalid token data received');
        return false;
      }
      
      // Store the token data
      const tokenToStore: ApiToken = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || '',
        expiresAt: Date.now() + (tokenData.expires_in * 1000),
        userId: tokenData.user_id,
        scope: tokenData.scope,
        tokenType: tokenData.token_type || 'Bearer' // Store token type
      };
      
      // Attempt to make an API call to check if the token works
      console.log('Testing token with Fitbit API');
      const testResponse = await fetch('https://api.fitbit.com/1/user/-/profile.json', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`
        }
      });
      
      console.log('Token test response:', testResponse.status);
      
      if (!testResponse.ok) {
        console.error('Token appears valid but API test failed:', testResponse.status);
        const errorText = await testResponse.text();
        console.error('API error details:', errorText);
      } else {
        console.log('Token successfully validated with API');
      }
      
      console.log('Storing token data - Expires at:', new Date(tokenToStore.expiresAt).toISOString());
      await AsyncStorage.setItem(API_TOKEN_STORAGE_KEY, JSON.stringify(tokenToStore));
      
      // Get user profile to store as "device"
      await this._getUserProfile();
      
      return true;
    } catch (error) {
      console.error('Error exchanging code for token:', error);
      return false;
    }
  }
  
  /**
   * Refresh access token using refresh token
   */
  static async refreshAccessToken(): Promise<boolean> {
    try {
      const tokenJson = await AsyncStorage.getItem(API_TOKEN_STORAGE_KEY);
      if (!tokenJson) {
        console.log('No token found to refresh');
        return false;
      }
      
      const token: ApiToken = JSON.parse(tokenJson);
      if (!token.refreshToken) {
        console.log('No refresh token available');
        return false;
      }
      
      console.log('Refreshing access token');
      
      // Build the token request
      const tokenUrl = 'https://api.fitbit.com/oauth2/token';
      const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${base64.encode(`${CLIENT_ID}:${CLIENT_SECRET}`)}`
      };
      
      // Create the request body
      const body = new URLSearchParams();
      body.append('client_id', CLIENT_ID);
      body.append('grant_type', 'refresh_token');
      body.append('refresh_token', token.refreshToken);
      
      // Make the token request
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: headers,
        body: body.toString(),
      });
      
      // Log the full response for debugging
      console.log('Token refresh response status:', response.status);
      
      // Check if the request was successful
      if (!response.ok) {
        console.error(`Token refresh failed with status ${response.status}: ${response.statusText}`);
        const errorText = await response.text();
        console.error('Error details:', errorText);
        return false;
      }
      
      // Parse the token response
      const tokenData = await response.json();
      console.log('Token refresh successful');
      
      if (!tokenData.access_token) {
        console.error('Invalid token data received');
        return false;
      }
      
      // Store the updated token data
      const tokenToStore: ApiToken = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || token.refreshToken,
        expiresAt: Date.now() + (tokenData.expires_in * 1000),
        userId: tokenData.user_id || token.userId,
        scope: tokenData.scope || token.scope
      };
      
      console.log('Storing refreshed token data - Expires at:', new Date(tokenToStore.expiresAt).toISOString());
      await AsyncStorage.setItem(API_TOKEN_STORAGE_KEY, JSON.stringify(tokenToStore));
      
      return true;
    } catch (error) {
      console.error('Error refreshing access token:', error);
      return false;
    }
  }
  
  /**
   * Handle the authorization callback URL
   */
  static async handleAuthorizationCallback(url: string): Promise<boolean> {
    try {
      console.log('Handling callback URL:', url);
      
      // Check URL for parameters
      if (url.includes('access_token=')) {
        // Implicit flow - token is in the URL
        console.log('Processing Implicit Grant callback');
        return await this._handleImplicitGrantCallback(url);
      } else if (url.includes('code=')) {
        // Authorization code flow - exchange code for token
        console.log('Processing Authorization Code Grant callback');
        return await this._handleAuthorizationCodeCallback(url);
      } else if (url.includes('error=')) {
        // Error in authorization
        const errorMatch = url.match(/[#?&]error=([^&]+)/);
        const errorDescMatch = url.match(/[#?&]error_description=([^&]+)/);
        
        const error = errorMatch ? decodeURIComponent(errorMatch[1]) : 'unknown';
        const errorDesc = errorDescMatch ? decodeURIComponent(errorDescMatch[1]).replace(/\+/g, ' ') : 'Unknown error';
        
        console.error(`Authorization error: ${error} - ${errorDesc}`);
        return false;
      } else {
        console.log('No token or code found in callback URL');
        
        // Log URL details for debugging
        console.log('URL format check:');
        console.log('- Has # fragment:', url.includes('#'));
        console.log('- Has ? query:', url.includes('?'));
        console.log('- URL length:', url.length);
        
        // Log parameters if present
        if (url.includes('?')) {
          const queryParams = new URLSearchParams(url.split('?')[1]);
          console.log('Query parameters:');
          queryParams.forEach((value, key) => {
            console.log(`- ${key}: ${value}`);
          });
        }
        
        if (url.includes('#')) {
          const hashParams = new URLSearchParams(url.split('#')[1]);
          console.log('Hash parameters:');
          hashParams.forEach((value, key) => {
            console.log(`- ${key}: ${value}`);
          });
        }
        
        return false;
      }
    } catch (error) {
      console.error('Error handling authorization callback:', error);
      return false;
    }
  }
  
  /**
   * Handle Implicit Grant callback
   */
  static async _handleImplicitGrantCallback(url: string): Promise<boolean> {
    try {
      console.log('Processing Implicit Grant callback');
      
      // Direct token extraction attempt first
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
      console.error('Error handling Implicit Grant callback:', error);
      return false;
    }
  }
  
  /**
   * Handle Authorization Code Grant callback
   */
  static async _handleAuthorizationCodeCallback(url: string): Promise<boolean> {
    try {
      console.log('Processing Authorization Code callback');
      console.log('Full callback URL:', url); // Log the full URL for debugging
      
      // Extract the authorization code from the URL
      const codeMatch = url.match(/[?&]code=([^&]+)/);
      if (!codeMatch || !codeMatch[1]) {
        console.error('No authorization code found in URL');
        console.log('URL structure:', url.split(/[?&#]/)); // Log URL structure for debugging
        return false;
      }
      
      const code = codeMatch[1];
      console.log('Found authorization code');
      
      // Exchange the code for tokens
      return await this._exchangeCodeForToken(code);
    } catch (error) {
      console.error('Error handling Authorization Code callback:', error);
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
        
        // If token is expired, try to refresh it
        if (response.status === 401) {
          console.log('Token expired, attempting to refresh');
          const refreshed = await this.refreshAccessToken();
          if (refreshed) {
            console.log('Token refreshed, retrying profile request');
            return await this._getUserProfile();
          }
        }
        
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
        
        // If we have a refresh token, try to refresh
        if (token.refreshToken) {
          console.log('Attempting to refresh token');
          return await this.refreshAccessToken();
        }
        
        // In implicit flow, we can't refresh tokens, so we need to re-authorize
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
   * Get device info from Fitbit API
   */
  static async getDeviceInfo(): Promise<{ name: string, batteryLevel: number } | null> {
    try {
      console.log('Getting device info from Fitbit API');
      
      const tokenJson = await AsyncStorage.getItem(API_TOKEN_STORAGE_KEY);
      if (!tokenJson) {
        console.log('No access token available');
        throw new Error('No access token available');
      }
      
      const token: ApiToken = JSON.parse(tokenJson);
      
      // Check if token is expired
      if (token.expiresAt < Date.now()) {
        console.log('Access token has expired');
        
        // Try to refresh token if available
        if (token.refreshToken) {
          const refreshed = await this.refreshAccessToken();
          if (refreshed) {
            console.log('Token refreshed, retrying device info request');
            return await this.getDeviceInfo();
          }
        }
        
        throw new Error('Access token has expired');
      }
      
      // Fetch device data from Fitbit API
      console.log('Fetching devices from Fitbit API');
      const response = await fetch(
        'https://api.fitbit.com/1/user/-/devices.json',
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token.accessToken}`,
            'Accept': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        console.error('Device request failed:', response.status, response.statusText);
        throw new Error(`Failed to get device info: ${response.status}`);
      }
      
      const devices = await response.json();
      console.log('Received devices from API:', devices);
      
      // Check if we have any devices
      if (devices && devices.length > 0) {
        // Use the first device
        const device = devices[0];
        console.log('Selected device:', device);
        
        // Update the stored device info with this device model
        const storedDevice = await this.getConnectedDevice();
        if (storedDevice) {
          storedDevice.model = device.deviceVersion;
          // Save the updated device info
          await AsyncStorage.setItem(DEVICE_STORAGE_KEY, JSON.stringify(storedDevice));
        }
        
        return {
          name: device.deviceVersion,
          batteryLevel: device.batteryLevel || 100
        };
      }
      
      console.log('No devices found in API response, using stored device');
      
      // If no devices found, return the stored device with a default battery level
      const storedDevice = await this.getConnectedDevice();
      if (storedDevice) {
        return {
          name: storedDevice.name,
          batteryLevel: storedDevice.batteryLevel || 100
        };
      }
      
      console.log('No stored device found');
      return null;
    } catch (error) {
      console.error('Error getting device info from API:', error);
      return null;
    }
  }
  
  /**
   * Revoke authorization
   */
  static async disconnectDevice(): Promise<void> {
    try {
      console.log('Revoking Fitbit authorization');
      
      // Check if we have a token to revoke
      const tokenJson = await AsyncStorage.getItem(API_TOKEN_STORAGE_KEY);
      if (tokenJson) {
        const token: ApiToken = JSON.parse(tokenJson);
        
        // Call the revoke endpoint if we have a token
        if (token.accessToken) {
          try {
            // Try to revoke the token with Fitbit
            const response = await fetch('https://api.fitbit.com/oauth2/revoke', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${base64.encode(`${CLIENT_ID}:${CLIENT_SECRET}`)}`
              },
              body: `token=${token.accessToken}`
            });
            
            console.log('Token revocation response:', response.status);
          } catch (revokeError) {
            console.error('Error revoking token (continuing with local cleanup):', revokeError);
          }
        }
      }
      
      // Remove stored tokens and device regardless of revoke result
      await AsyncStorage.removeItem(API_TOKEN_STORAGE_KEY);
      await AsyncStorage.removeItem(DEVICE_STORAGE_KEY);
      await AsyncStorage.removeItem(CODE_VERIFIER_STORAGE_KEY);
      
      console.log('Authorization tokens and device info removed');
    } catch (error) {
      console.error('Error revoking authorization:', error);
    }
  }
  
  /**
   * Get heart rate from Fitbit API
   * @returns {Promise<{value: number, deviceTime?: string} | null>} Heart rate value and device time string
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
      console.log('Token details:', {
        accessTokenLength: token.accessToken ? token.accessToken.length : 0,
        hasRefreshToken: !!token.refreshToken,
        expiryDate: new Date(token.expiresAt).toISOString(),
        scope: token.scope || 'not specified'
      });
      
      // Check if token is expired or will expire in the next 10 minutes
      const tenMinutesInMs = 10 * 60 * 1000;
      if (token.expiresAt < Date.now() + tenMinutesInMs) {
        console.log('Access token has expired or will expire soon');
        
        // Try to refresh token if available
        if (token.refreshToken) {
          console.log('Attempting to refresh token before heart rate request');
          const refreshed = await this.refreshAccessToken();
          if (refreshed) {
            console.log('Token refreshed successfully, retrying heart rate request');
            // Get updated token after refresh
            const updatedTokenJson = await AsyncStorage.getItem(API_TOKEN_STORAGE_KEY);
            if (updatedTokenJson) {
              const updatedToken = JSON.parse(updatedTokenJson);
              console.log('Using new access token, expires at:', new Date(updatedToken.expiresAt).toISOString());
              return await this.getHeartRate();
            }
          } else {
            console.error('Token refresh failed, cannot continue with heart rate request');
          }
        }
        
        throw new Error('Access token has expired and refresh failed');
      }
      
      // Get today's date in the format YYYY-MM-DD
      const today = new Date().toISOString().split('T')[0];
      console.log('Getting heart rate data for date:', today);
      
      // Fetch heart rate data from Fitbit API - try intraday data first
      // This requires personal app type or special permission
      try {
        const intradayResponse = await fetch(
        `https://api.fitbit.com/1/user/-/activities/heart/date/${today}/1d/1min.json`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token.accessToken}`,
            'Accept': 'application/json'
          }
        }
      );
        
        if (intradayResponse.ok) {
          const data = await intradayResponse.json();
          console.log('Received intraday heart rate data');
          
          // Check if we have intraday data
          if (data['activities-heart-intraday'] && 
              data['activities-heart-intraday'].dataset && 
              data['activities-heart-intraday'].dataset.length > 0) {
            
            // Get the most recent heart rate reading
            const dataset = data['activities-heart-intraday'].dataset;
            const latestReading = dataset[dataset.length - 1];
            console.log('Latest intraday heart rate reading:', latestReading);
            
            // Return both heart rate value and time string
            return {
              value: latestReading.value,
              deviceTime: latestReading.time
            };
          }
        } else {
          console.log('Intraday heart rate request failed:', intradayResponse.status);
          
          // This is expected if the app doesn't have intraday access
          // We'll fall back to the regular heart rate endpoint
        }
      } catch (intradayError) {
        console.error('Error getting intraday heart rate:', intradayError);
        // Fall back to regular heart rate endpoint
      }
      
      // Call Fitbit API to get heart rate data
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
      console.log('Received heart rate time series data');
      
      // Check if there are heart rate zones or resting heart rate
      if (data['activities-heart'] && 
          data['activities-heart'].length > 0 && 
          data['activities-heart'][0].value) {
        
        // Use resting heart rate if available
        if (data['activities-heart'][0].value.restingHeartRate) {
          const restingHeartRate = data['activities-heart'][0].value.restingHeartRate;
          console.log('Using resting heart rate:', restingHeartRate);
          // Get the latest date from the data for a timestamp
          const dateString = data['activities-heart'][0].dateTime;
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
}

export default FitbitAuthService;