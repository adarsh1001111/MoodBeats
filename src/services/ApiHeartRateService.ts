import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// Constants
const HEART_RATE_STORAGE_KEY = 'heartrate_history';
const API_TOKEN_STORAGE_KEY = 'fitbit_api_token';

// Define interfaces
export interface HeartRateReading {
  value: number;
  timestamp: number;
}

export interface ApiToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  userId?: string;
  scope?: string;
}

/**
 * API-based Heart Rate Service
 * Fetches heart rate data from Fitbit Web API
 */
class ApiHeartRateService {
  // Base URL for Fitbit API
  private static readonly FITBIT_API_BASE = 'https://api.fitbit.com/1/user/-/';
  
  // Simulated heart rate data and fetch interval
  private static fetchInterval: NodeJS.Timeout | null = null;
  private static lastHeartRate = 70;
  private static isSimulating = false;
  
  /**
   * Initialize the API service
   */
  static async initialize(): Promise<void> {
    // Check if we have stored tokens
    const hasTokens = await this.hasValidTokens();
    
    // If not simulating and not connected, start simulation
    if (!hasTokens && !this.isSimulating) {
      this.startSimulation();
    }
  }
  
  /**
   * Check if we have valid API tokens
   */
  static async hasValidTokens(): Promise<boolean> {
    try {
      const tokenJson = await AsyncStorage.getItem(API_TOKEN_STORAGE_KEY);
      if (!tokenJson) return false;
      
      const token: ApiToken = JSON.parse(tokenJson);
      const now = Date.now();
      
      // Check if token is expired
      if (token.expiresAt < now) {
        // Try to refresh token
        const refreshed = await this.refreshToken(token.refreshToken);
        return refreshed;
      }
      
      return true;
    } catch (error) {
      console.error('Error checking tokens:', error);
      return false;
    }
  }
  
  /**
   * Refresh the API token
   */
  static async refreshToken(refreshToken: string): Promise<boolean> {
    try {
      // Import the auth service method to use the real token refresh
      const FitbitAuthService = require('./auth/FitbitAuthService').default;
      
      // Use the actual token refresh from the auth service instead of simulation
      return await FitbitAuthService.refreshAccessToken();
    } catch (error) {
      console.error('Error refreshing token:', error);
      return false;
    }
  }
  
  /**
   * Start simulating heart rate data
   */
  static startSimulation(): void {
    if (this.isSimulating) return;
    
    this.isSimulating = true;
    
    // Set up interval to generate heart rate data
    this.fetchInterval = setInterval(() => {
      // Simulate gradual changes in heart rate
      const change = Math.random() * 10 - 5; // -5 to +5
      this.lastHeartRate += change;
      
      // Keep heart rate within realistic bounds
      this.lastHeartRate = Math.max(60, Math.min(180, this.lastHeartRate));
      
      // Round to integer
      this.lastHeartRate = Math.round(this.lastHeartRate);
      
      // Store the heart rate
      this.storeHeartRate(this.lastHeartRate);
      
      console.log('Simulated heart rate:', this.lastHeartRate);
    }, 60000); // Update every minute
  }
  
  /**
   * Stop heart rate simulation
   */
  static stopSimulation(): void {
    if (this.fetchInterval) {
      clearInterval(this.fetchInterval);
      this.fetchInterval = null;
    }
    this.isSimulating = false;
  }
  
  /**
   * Store heart rate reading
   */
  static async storeHeartRate(value: number): Promise<void> {
    try {
      // Get existing history
      const historyJson = await AsyncStorage.getItem(HEART_RATE_STORAGE_KEY);
      let history: HeartRateReading[] = historyJson ? JSON.parse(historyJson) : [];
      
      // Add new reading
      history.push({
        value,
        timestamp: Date.now(),
      });
      
      // Keep only last 100 readings
      if (history.length > 100) {
        history = history.slice(-100);
      }
      
      // Store updated history
      await AsyncStorage.setItem(HEART_RATE_STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Error storing heart rate:', error);
    }
  }
  
  /**
   * Check internet connectivity
   */
  static async checkConnectivity(): Promise<boolean> {
    const netInfo = await NetInfo.fetch();
    return netInfo.isConnected ?? false;
  }
  
  /**
   * Authorize with Fitbit API
   * This now uses the real OAuth flow from FitbitAuthService
   */
  static async authorize(): Promise<boolean> {
    try {
      // Import the auth service to use the real OAuth flow
      const FitbitAuthService = require('./auth/FitbitAuthService').default;
      
      // Initialize the auth service
      FitbitAuthService.init();
      
      // Use the OAuth flow with PKCE for better security
      const success = await FitbitAuthService.authorize('authorization_code_pkce');
      
      if (success) {
        // Stop simulation if it was running
        this.stopSimulation();
      }
      
      return success;
    } catch (error) {
      console.error('Error authorizing with Fitbit:', error);
      return false;
    }
  }
  
  /**
   * Revoke authorization
   */
  static async revokeAuthorization(): Promise<void> {
    try {
      // Remove stored tokens
      await AsyncStorage.removeItem(API_TOKEN_STORAGE_KEY);
      
      // Start simulation since we're no longer connected
      this.startSimulation();
    } catch (error) {
      console.error('Error revoking authorization:', error);
    }
  }
  
  /**
   * Check if currently authorized
   */
  static async isAuthorized(): Promise<boolean> {
    return this.hasValidTokens();
  }
  
  /**
   * Get latest heart rate data from Fitbit API
   */
  static async getLatestHeartRate(): Promise<number> {
    try {
      // Check if we have internet connectivity
      const isConnected = await this.checkConnectivity();
      if (!isConnected) {
        console.log('No internet connection, using stored or simulated data');
        throw new Error('No internet connection');
      }
      
      // Check if we have valid tokens
      const hasTokens = await this.hasValidTokens();
      if (!hasTokens) {
        console.log('Not authorized with Fitbit API, using stored or simulated data');
        throw new Error('Not authorized with Fitbit API');
      }
      
      // Import the FitbitAuthService to use its methods
      const FitbitAuthService = require('./auth/FitbitAuthService').default;
      
      try {
        // Use the actual Fitbit API via FitbitAuthService instead of simulation
        const heartRateData = await FitbitAuthService.getHeartRate();
        
        if (heartRateData && heartRateData.value) {
          // Store the heart rate
          this.storeHeartRate(heartRateData.value);
          this.lastHeartRate = heartRateData.value;
          
          return heartRateData.value;
        }
        
        // If no heart rate from API, fall back to simulation
        console.log('No heart rate data from API, using simulation');
        const heartRate = this.simulateApiResponse();
        this.storeHeartRate(heartRate);
        this.lastHeartRate = heartRate;
        return heartRate;
      } catch (apiError) {
        console.error('Error fetching heart rate from API:', apiError);
        
        // Try to get the last stored heart rate
        const latestStored = await this.getLatestStoredHeartRate();
        if (latestStored) {
          return latestStored;
        }
        
        // If all else fails, simulate a heart rate
        return this.simulateApiResponse();
      }
    } catch (error) {
      console.error('Error getting heart rate:', error);
      
      // If we're not connected or authorized, use stored or simulated data
      const latestStored = await this.getLatestStoredHeartRate();
      if (latestStored) {
        return latestStored;
      }
      
      return this.simulateApiResponse();
    }
  }
  
  /**
   * Get heart rate history
   */
  static async getHeartRateHistory(limit = 10): Promise<HeartRateReading[]> {
    try {
      // Get from storage
      const historyJson = await AsyncStorage.getItem(HEART_RATE_STORAGE_KEY);
      if (!historyJson) return [];
      
      const history: HeartRateReading[] = JSON.parse(historyJson);
      
      // Return most recent entries up to limit
      return history.slice(-limit).reverse();
    } catch (error) {
      console.error('Error getting heart rate history:', error);
      return [];
    }
  }
  
  /**
   * Get latest stored heart rate
   */
  static async getLatestStoredHeartRate(): Promise<number | null> {
    try {
      const historyJson = await AsyncStorage.getItem(HEART_RATE_STORAGE_KEY);
      if (!historyJson) return null;
      
      const history: HeartRateReading[] = JSON.parse(historyJson);
      if (history.length === 0) return null;
      
      // Get most recent heart rate
      const lastReading = history[history.length - 1];
      return lastReading.value;
    } catch (error) {
      console.error('Error getting latest stored heart rate:', error);
      return null;
    }
  }
  
  /**
   * Simulate API response
   */
  private static simulateApiResponse(): number {
    // Base heart rate
    let heartRate = this.lastHeartRate;
    
    // Add some randomness
    const change = Math.random() * 8 - 4; // -4 to +4
    heartRate += change;
    
    // Get current time to add time-based variation
    const now = new Date();
    const hour = now.getHours();
    
    // Heart rate tends to be lower at night, higher during day
    if (hour >= 22 || hour < 6) {
      // Night time - lower heart rate
      heartRate -= 5;
    } else if (hour >= 8 && hour < 20) {
      // Day time - higher heart rate
      heartRate += 5;
    }
    
    // Ensure realistic bounds
    heartRate = Math.max(55, Math.min(180, heartRate));
    
    // Round to integer
    return Math.round(heartRate);
  }
  
  /**
   * Get user device information (for API calls)
   */
  static async getDeviceInfo(): Promise<{ name: string, batteryLevel: number }> {
    // In a real app, you would fetch this from the Fitbit API
    // https://api.fitbit.com/1/user/-/devices.json
    
    // For demo purposes, return simulated data
    return {
      name: 'Fitbit Sense',
      batteryLevel: Math.floor(Math.random() * 100),
    };
  }
  
  /**
   * Get user activity data
   */
  static async getUserActivity(): Promise<{ steps: number, activeMinutes: number }> {
    // In a real app, you would fetch this from the Fitbit API
    // https://api.fitbit.com/1/user/-/activities/date/today.json
    
    // For demo purposes, return simulated data
    return {
      steps: Math.floor(Math.random() * 10000) + 2000,
      activeMinutes: Math.floor(Math.random() * 60) + 20,
    };
  }
}

export default ApiHeartRateService;