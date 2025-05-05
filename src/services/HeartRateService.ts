import AsyncStorage from '@react-native-async-storage/async-storage';
import { Accelerometer } from 'expo-sensors';
import NetInfo from '@react-native-community/netinfo';
import FitbitAuthService, { FitbitDevice } from './auth/FitbitAuthService';

// Constants
const HEART_RATE_STORAGE_KEY = 'heartrate_history';
const HEART_RATE_MONITOR_INTERVAL_KEY = 'heartrate_monitor_interval';
const DEFAULT_MONITOR_INTERVAL = 60000; // 1 minute

// Define interfaces for our data
export interface HeartRateReading {
  value: number;
  timestamp: number;
  source?: string; // 'fitbit', 'simulation', 'stored'
}

/**
 * Heart Rate Service for Fitbit integration
 * Uses Fitbit API and falls back to simulation when needed
 */
class HeartRateService {
  // For simulating heart rate data
  private static fetchInterval: NodeJS.Timeout | null = null;
  private static lastHeartRate = 70;
  private static isSimulating = false;
  private static isAccelerometerSubscribed = false;
  private static connectedDevice: FitbitDevice | null = null;
  
  // For interval-based monitoring
  private static monitoringInterval: NodeJS.Timeout | null = null;
  private static isMonitoring = false;
  private static monitoringRetryCount = 0;
  private static maxMonitoringRetries = 3;
  
  /**
   * Initialize the service
   */
  static async initialize(): Promise<void> {
    console.log('Initializing HeartRateService');
    
    // Initialize the FitbitAuthService
    FitbitAuthService.init();
    
    // Check if we have stored tokens
    const hasTokens = await FitbitAuthService.hasValidTokens();
    console.log('Has valid tokens:', hasTokens);
    
    // Load the connected device if available
    this.connectedDevice = await FitbitAuthService.getConnectedDevice();
    console.log('Connected device:', this.connectedDevice);
    
    // Check if monitoring was previously enabled
    const monitoringEnabled = await AsyncStorage.getItem('heartrate_monitoring_enabled');
    if (monitoringEnabled === 'true') {
      const interval = await AsyncStorage.getItem(HEART_RATE_MONITOR_INTERVAL_KEY);
      const monitorInterval = interval ? parseInt(interval) : DEFAULT_MONITOR_INTERVAL;
      console.log('Resuming heart rate monitoring with interval:', monitorInterval);
      this.startMonitoring(monitorInterval);
    }
    
    // If not connected, start simulation
    if (!hasTokens && !this.isSimulating) {
      this.startSimulation();
    }
  }
  
  /**
   * Start heart rate monitoring at regular intervals
   * @param interval Interval in milliseconds (default: 60000 = 1 minute)
   */
  static async startMonitoring(interval: number = DEFAULT_MONITOR_INTERVAL): Promise<boolean> {
    if (this.isMonitoring) {
      console.log('Heart rate monitoring already running');
      return false;
    }
    
    console.log(`Starting heart rate monitoring every ${interval}ms`);
    this.isMonitoring = true;
    this.monitoringRetryCount = 0;
    
    // Store monitoring state
    await AsyncStorage.setItem('heartrate_monitoring_enabled', 'true');
    await AsyncStorage.setItem(HEART_RATE_MONITOR_INTERVAL_KEY, interval.toString());
    
    // Fetch immediately
    this.fetchHeartRate();
    
    // Set up interval for regular fetching
    this.monitoringInterval = setInterval(() => {
      this.fetchHeartRate().catch(error => {
        console.error('Error in monitoring interval:', error);
        this.monitoringRetryCount++;
        
        // If we've had too many failures, stop monitoring
        if (this.monitoringRetryCount > this.maxMonitoringRetries) {
          console.log('Too many monitoring failures, stopping monitoring');
          this.stopMonitoring();
        }
      });
    }, interval);
    
    return true;
  }
  
  /**
   * Stop heart rate monitoring
   */
  static async stopMonitoring(): Promise<boolean> {
    if (!this.isMonitoring) {
      console.log('Heart rate monitoring not running');
      return false;
    }
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    this.isMonitoring = false;
    console.log('Heart rate monitoring stopped');
    
    // Store monitoring state
    await AsyncStorage.setItem('heartrate_monitoring_enabled', 'false');
    
    return true;
  }
  
  /**
   * Check if monitoring is active
   */
  static isMonitoringActive(): boolean {
    return this.isMonitoring;
  }
  
  /**
   * Start simulating heart rate data
   */
  static startSimulation(): void {
    if (this.isSimulating) return;
    
    this.isSimulating = true;
    console.log('Starting heart rate simulation');
    
    // Start accelerometer-based simulation
    this._startAccelerometerBasedSimulation();
    
    // Set up interval to generate heart rate data periodically
    this.fetchInterval = setInterval(() => {
      // We don't need to do anything here as the accelerometer
      // listener will be updating the heart rate continuously
      console.log('Current simulated heart rate:', this.lastHeartRate);
    }, 60000); // Log every minute
  }
  
  /**
   * Start accelerometer-based heart rate simulation
   */
  static _startAccelerometerBasedSimulation(): void {
    if (this.isAccelerometerSubscribed) {
      return;
    }
    
    try {
      // Subscribe to accelerometer updates
      Accelerometer.setUpdateInterval(1000); // Update every second
      
      Accelerometer.addListener(accelerometerData => {
        const { x, y, z } = accelerometerData;
        const magnitude = Math.sqrt(x * x + y * y + z * z);
        
        // Update heart rate based on movement
        // More movement = higher heart rate
        const movement = Math.abs(magnitude - 1) * 20; // 1g = no movement
        const baseHeartRate = 70; // Resting heart rate
        const newHeartRate = Math.floor(baseHeartRate + movement);
        
        // Smoothly transition to new heart rate
        this.lastHeartRate = Math.round(this.lastHeartRate * 0.9 + newHeartRate * 0.1);
        
        // Ensure heart rate is within realistic bounds
        this.lastHeartRate = Math.max(60, Math.min(180, this.lastHeartRate));
        
        // Store the heart rate periodically (every 10 seconds)
        // This reduces excessive storage operations
        if (Math.random() < 0.1) {
          this._storeHeartRate(this.lastHeartRate, 'simulation');
        }
      });
      
      this.isAccelerometerSubscribed = true;
      console.log('Accelerometer-based heart rate simulation started');
    } catch (error) {
      console.error('Error setting up accelerometer:', error);
      // Fall back to simple time-based simulation
      this._startTimeBasedSimulation();
    }
  }
  
  /**
   * Start a simple time-based heart rate simulation
   * Used as a fallback if accelerometer is not available
   */
  static _startTimeBasedSimulation(): void {
    this.fetchInterval = setInterval(() => {
      // Simulate small changes in heart rate
      const change = Math.floor(Math.random() * 5) - 2; // -2 to +2
      this.lastHeartRate += change;
      
      // Ensure heart rate is within realistic bounds
      this.lastHeartRate = Math.max(60, Math.min(100, this.lastHeartRate));
      
      // Store the heart rate
      this._storeHeartRate(this.lastHeartRate, 'simulation');
      
      console.log('Simulated heart rate (time-based):', this.lastHeartRate);
    }, 30000); // Every 30 seconds
  }
  
  /**
   * Stop heart rate simulation
   */
  static stopSimulation(): void {
    if (this.fetchInterval) {
      clearInterval(this.fetchInterval);
      this.fetchInterval = null;
    }
    
    if (this.isAccelerometerSubscribed) {
      Accelerometer.removeAllListeners();
      this.isAccelerometerSubscribed = false;
    }
    
    this.isSimulating = false;
    console.log('Heart rate simulation stopped');
  }
  
  /**
   * Fetch heart rate and store it
   * This is the main method used by the monitoring interval
   */
  static async fetchHeartRate(): Promise<number | null> {
    try {
      const isConnected = await this.isConnected();
      let heartRate: number | null = null;
      let source: string = 'stored';
      
      if (isConnected) {
        // Get heart rate from Fitbit API
        heartRate = await FitbitAuthService.getHeartRate();
        if (heartRate) {
          console.log('Fetched heart rate from Fitbit API:', heartRate);
          source = 'fitbit';
        } else {
          console.log('Failed to get heart rate from Fitbit API');
        }
      }
      
      // If we couldn't get a heart rate from Fitbit, use simulated or stored data
      if (!heartRate) {
        if (this.isSimulating) {
          // Use simulated heart rate
          heartRate = this.lastHeartRate;
          source = 'simulation';
          console.log('Using simulated heart rate:', heartRate);
        } else {
          // Try to get the last stored heart rate
          const lastReading = await this._getLatestStoredHeartRate();
          if (lastReading) {
            heartRate = lastReading.value;
            source = lastReading.source || 'stored';
            console.log('Using stored heart rate:', heartRate);
          } else {
            // No connection, not simulating, and no stored data
            console.log('No heart rate source available, starting simulation');
            this.startSimulation();
            heartRate = this.lastHeartRate;
            source = 'simulation';
          }
        }
      }
      
      if (heartRate) {
        // Store the heart rate for history
        await this._storeHeartRate(heartRate, source);
        return heartRate;
      }
    } catch (error) {
      console.error('Error fetching heart rate:', error);
      
      // If we have too many errors, start simulation as a fallback
      if (!this.isSimulating) {
        console.log('Starting simulation due to fetch errors');
        this.startSimulation();
      }
    }
    
    return null;
  }
  
  /**
   * Store heart rate reading
   */
  static async _storeHeartRate(value: number, source: string = 'unknown'): Promise<void> {
    try {
      // Get existing history
      const historyJson = await AsyncStorage.getItem(HEART_RATE_STORAGE_KEY);
      let history: HeartRateReading[] = historyJson ? JSON.parse(historyJson) : [];
      
      // Add new reading
      history.push({
        value,
        timestamp: Date.now(),
        source
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
   * Opens the Fitbit authorization page in a browser
   * @param authFlow Optional auth flow type (implicit or authorization_code_pkce)
   */
  static async authorize(authFlow?: string): Promise<boolean> {
    try {
      console.log('Starting Fitbit authorization');
      
      // Check if we're already authorized
      const alreadyAuthorized = await FitbitAuthService.hasValidTokens();
      if (alreadyAuthorized) {
        console.log('Already authorized, updating connected device');
        this.connectedDevice = await FitbitAuthService.getConnectedDevice();
        return true;
      }
      
      // Get authorization from Fitbit
      const success = await FitbitAuthService.authorize(authFlow);
      console.log('FitbitAuthService.authorize() result:', success);
      
      if (success) {
        // If authorization succeeded, get the connected device
        this.connectedDevice = await FitbitAuthService.getConnectedDevice();
        
        // Stop simulation if it was running
        if (this.isSimulating) {
          this.stopSimulation();
        }
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
  static async disconnectDevice(): Promise<void> {
    console.log('Disconnecting Fitbit device');
    
    // Stop monitoring if it was running
    if (this.isMonitoring) {
      this.stopMonitoring();
    }
    
    await FitbitAuthService.disconnectDevice();
    this.connectedDevice = null;
    
    // Start simulation since we're no longer connected
    this.startSimulation();
    
    console.log('Fitbit device disconnected, simulation started');
  }
  
  /**
   * Check if currently connected/authorized
   */
  static async isConnected(): Promise<boolean> {
    const connected = await FitbitAuthService.isConnected();
    console.log('Checking if connected to Fitbit:', connected);
    return connected;
  }
  
  /**
   * Handle Fitbit auth callback from deep link
   */
  static async handleFitbitAuthCallback(url: string): Promise<boolean> {
    console.log('HeartRateService handling Fitbit auth callback:', url);
    
    try {
      // Log detailed information about the URL for debugging
      console.log('URL format check:');
      console.log('- Has # fragment:', url.includes('#'));
      console.log('- Has ? query:', url.includes('?'));
      console.log('- Has access_token in fragment:', url.includes('#access_token='));
      console.log('- Has access_token in query:', url.includes('?access_token='));
      console.log('- Has access_token anywhere:', url.includes('access_token='));
      console.log('- URL length:', url.length);
      console.log('- Full URL:', url);
      
      // Check for specific callback patterns
      if (url.includes('fitbit-callback') && url.includes('access_token=')) {
        console.log('Detected direct callback URL with token');
      }
      
      // Check for our custom auth-token format (highest priority)
      if (url.includes('auth-token/')) {
        console.log('Detected auth-token direct path format');
        
        try {
          // Extract token directly from the path
          const urlParts = url.split('auth-token/');
          if (urlParts.length >= 2) {
            const tokenPath = urlParts[1];
            
            // Handle query parameters vs path segment
            const tokenParts = tokenPath.split('?');
            const accessToken = tokenParts[0]; // First part is the token
            
            if (accessToken && accessToken.length > 10) {
              console.log('Found valid token in direct path format:', accessToken.substring(0, 5) + '...');
              
              // Use the handleManualToken method since we already have the token
              const success = await this.handleManualToken(accessToken);
              if (success) {
                console.log('Successfully authenticated with direct token');
                return true;
              }
            }
          }
        } catch (tokenError) {
          console.error('Error extracting token from auth-token path:', tokenError);
        }
      }
      
      // For URLs with the redirect URI pattern, extract token directly if it's there
      if (url.includes('moodmusicapp.netlify.app') || url.includes('moodbeats.netlify.app')) {
        console.log('Detected redirect URL, looking for token directly');
        
        // Try to extract token from URL even if in a non-standard format
        const tokenMatch = url.match(/[#?&]?access_token=([^&]+)/);
        if (tokenMatch && tokenMatch[1]) {
          const accessToken = tokenMatch[1];
          const expiresInMatch = url.match(/expires_in=([^&]+)/);
          const expiresIn = expiresInMatch ? expiresInMatch[1] : '31536000';
          const userIdMatch = url.match(/user_id=([^&]+)/);
          const userId = userIdMatch ? userIdMatch[1] : undefined;
          
          console.log('Extracted token directly from URL');
          
          // Create token data and store it directly
          const tokenData = {
            accessToken: accessToken,
            refreshToken: '',
            expiresAt: Date.now() + (parseInt(expiresIn) * 1000),
            userId: userId
          };
          
          // Store token data
          await AsyncStorage.setItem('fitbit_api_token', JSON.stringify(tokenData));
          
          // Try to get user profile
          try {
            await FitbitAuthService._getUserProfile();
            
            // Update connected device
            this.connectedDevice = await FitbitAuthService.getConnectedDevice();
            
            // If we have a connected device now, consider it a success
            if (this.connectedDevice) {
              console.log('Direct token extraction approach successful');
              
              // Stop simulation if it was running
              if (this.isSimulating) {
                this.stopSimulation();
              }
              
              return true;
            }
          } catch (profileError) {
            console.error('Profile retrieval error, but token might still be valid:', profileError);
            // Continue with regular flow even if profile fails
          }
        }
      }
      
      // Forward the callback to FitbitAuthService as usual
      const success = await FitbitAuthService.handleAuthorizationCallback(url);
      
      if (success) {
        console.log('Fitbit authorization successful');
        // If authorization was successful, stop simulation if it was running
        if (this.isSimulating) {
          this.stopSimulation();
        }
        
        // Get the connected device
        this.connectedDevice = await FitbitAuthService.getConnectedDevice();
        
        // Fetch heart rate immediately to provide instant feedback
        const heartRate = await this.getLatestHeartRate();
        console.log('Initial heart rate after connection:', heartRate);
      } else {
        console.log('Fitbit authorization failed or was cancelled');
        
        // If we couldn't authenticate but the URL has token parts, try another approach
        if (url.includes('access_token=')) {
          console.log('URL contains token parts but parsing failed, trying alternative approach');
          
          // Extract just the access token using regex with a more flexible pattern
          const tokenMatch = url.match(/access_token=([^&#]+)/);
          if (tokenMatch && tokenMatch[1]) {
            const accessToken = tokenMatch[1];
            const expiresInMatch = url.match(/expires_in=([^&#]+)/);
            const expiresIn = expiresInMatch ? expiresInMatch[1] : '31536000';
            const userIdMatch = url.match(/user_id=([^&#]+)/);
            const userId = userIdMatch ? userIdMatch[1] : undefined;
            
            console.log('Extracted token using fallback regex approach');
            
            // Create token data and store it directly
            const tokenData = {
              accessToken: accessToken,
              refreshToken: '',
              expiresAt: Date.now() + (parseInt(expiresIn) * 1000),
              userId: userId
            };
            
            // Store token data
            await AsyncStorage.setItem('fitbit_api_token', JSON.stringify(tokenData));
            
            // Try to get user profile
            try {
              await FitbitAuthService._getUserProfile();
              
              // Update connected device
              this.connectedDevice = await FitbitAuthService.getConnectedDevice();
              
              // If we have a connected device now, consider it a success
              if (this.connectedDevice) {
                console.log('Alternative token extraction approach successful');
                
                // Stop simulation if it was running
                if (this.isSimulating) {
                  this.stopSimulation();
                }
                
                return true;
              }
            } catch (profileError) {
              console.error('Error getting user profile with fallback approach:', profileError);
              // Token might still be valid, check with a direct API call
              const isValidToken = await this._verifyTokenWithSimpleApiCall(accessToken);
              if (isValidToken) {
                console.log('Token validated with API call');
                // Update the device info manually
                this.connectedDevice = {
                  id: userId || 'unknown-user',
                  name: 'Fitbit Device',
                  batteryLevel: 100
                };
                // Stop simulation
                if (this.isSimulating) {
                  this.stopSimulation();
                }
                return true;
              }
            }
          }
        }
      }
      
      return success;
    } catch (error) {
      console.error('Error handling Fitbit auth callback:', error);
      return false;
    }
  }
  
  /**
   * Verify token with a simple API call
   * This is used as a last resort to check if a token is valid
   */
  static async _verifyTokenWithSimpleApiCall(token: string): Promise<boolean> {
    try {
      console.log('Verifying token with simple API call');
      
      // Make a simple API call to check if the token is valid
      const response = await fetch('https://api.fitbit.com/1/user/-/profile.json', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        console.log('Token is valid - API call succeeded');
        // If we got a successful response, the token is valid
        return true;
      }
      
      console.log('Token verification failed - API call returned:', response.status);
      return false;
    } catch (error) {
      console.error('Error verifying token with API call:', error);
      return false;
    }
  }
  
  /**
   * Handle manually entered token
   */
  static async handleManualToken(token: string): Promise<boolean> {
    try {
      console.log('Processing manually entered token');
      
      if (!token || token.trim().length < 10) {
        console.error('Invalid token provided');
        return false;
      }
      
      // Create token data
      const tokenData = {
        accessToken: token.trim(),
        refreshToken: '',
        expiresAt: Date.now() + (31536000 * 1000), // 1 year in milliseconds
        userId: undefined
      };
      
      // Store token data
      await AsyncStorage.setItem('fitbit_api_token', JSON.stringify(tokenData));
      
      // Try to get user profile to validate the token
      try {
        await FitbitAuthService._getUserProfile();
      } catch (profileError) {
        console.error('Error getting user profile with manual token:', profileError);
        
        // If we couldn't get the profile, the token is probably invalid
        await AsyncStorage.removeItem('fitbit_api_token');
        return false;
      }
      
      // Update connected device
      this.connectedDevice = await FitbitAuthService.getConnectedDevice();
      
      // If we have a connected device now, consider it a success
      if (this.connectedDevice) {
        console.log('Manual token setup successful');
        
        // Stop simulation if it was running
        if (this.isSimulating) {
          this.stopSimulation();
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error handling manual token:', error);
      return false;
    }
  }
  
  /**
   * Get connected device info
   */
  static async getConnectedDevice(): Promise<FitbitDevice | null> {
    return await FitbitAuthService.getConnectedDevice();
  }
  
  /**
   * Get latest stored heart rate
   */
  static async _getLatestStoredHeartRate(): Promise<HeartRateReading | null> {
    try {
      const historyJson = await AsyncStorage.getItem(HEART_RATE_STORAGE_KEY);
      if (!historyJson) return null;
      
      const history: HeartRateReading[] = JSON.parse(historyJson);
      if (history.length === 0) return null;
      
      // Get most recent heart rate
      const lastReading = history[history.length - 1];
      return lastReading;
    } catch (error) {
      console.error('Error getting stored heart rate:', error);
      return null;
    }
  }
  
  /**
   * Get latest heart rate
   * Uses API if connected, otherwise simulation
   */
  static async getLatestHeartRate(): Promise<number> {
    try {
      // Check if we're connected to a Fitbit account
      const isConnected = await this.isConnected();
      
      if (isConnected) {
        console.log('Getting heart rate from Fitbit API');
        // Use the API approach
        const heartRate = await FitbitAuthService.getHeartRate();
        if (heartRate) {
          console.log('Got heart rate from API:', heartRate);
          // Store the heart rate for history
          await this._storeHeartRate(heartRate, 'fitbit');
          return heartRate;
        } else {
          console.log('Failed to get heart rate from API, falling back to alternatives');
        }
      }
      
      // If we're not connected or API failed, try the stored data first
      const storedHeartRate = await this._getLatestStoredHeartRate();
      if (storedHeartRate && Date.now() - storedHeartRate.timestamp < 300000) { // Less than 5 minutes old
        console.log('Using recent stored heart rate:', storedHeartRate);
        return storedHeartRate.value;
      }
      
      // If no recent stored data, use/start simulation
      if (!this.isSimulating) {
        this.startSimulation();
      }
      
      // Use current simulated value
      console.log('Using simulated heart rate:', this.lastHeartRate);
      return this.lastHeartRate;
    } catch (error) {
      console.error('Error getting heart rate:', error);
      
      // In case of any errors, return the last simulated heart rate
      return this.lastHeartRate;
    }
  }
  
  /**
   * Get heart rate history
   * @param limit Maximum number of readings to return
   * @param minAge Minimum age of readings to include in milliseconds (0 = all)
   * @param maxAge Maximum age of readings to include in milliseconds (0 = all)
   */
  static async getHeartRateHistory(
    limit = 10, 
    minAge = 0, 
    maxAge = 0
  ): Promise<HeartRateReading[]> {
    try {
      const historyJson = await AsyncStorage.getItem(HEART_RATE_STORAGE_KEY);
      if (!historyJson) return [];
      
      const history: HeartRateReading[] = JSON.parse(historyJson);
      
      // Filter by age if specified
      let filteredHistory = history;
      if (minAge > 0 || maxAge > 0) {
        const now = Date.now();
        filteredHistory = history.filter(reading => {
          const age = now - reading.timestamp;
          if (minAge > 0 && age < minAge) return false;
          if (maxAge > 0 && age > maxAge) return false;
          return true;
        });
      }
      
      // Return most recent entries up to limit
      return filteredHistory.slice(-limit).reverse();
    } catch (error) {
      console.error('Error getting heart rate history:', error);
      return [];
    }
  }
  
  /**
   * Get average heart rate over a period
   * @param periodMinutes Period in minutes (default 60 = 1 hour)
   */
  static async getAverageHeartRate(periodMinutes = 60): Promise<number | null> {
    try {
      const maxAge = periodMinutes * 60 * 1000; // Convert minutes to milliseconds
      const readings = await this.getHeartRateHistory(100, 0, maxAge);
      
      if (readings.length === 0) {
        return null;
      }
      
      // Calculate average
      const sum = readings.reduce((total, reading) => total + reading.value, 0);
      return Math.round(sum / readings.length);
    } catch (error) {
      console.error('Error calculating average heart rate:', error);
      return null;
    }
  }
  
  /**
   * Get user device information
   */
  static async getDeviceInfo(): Promise<{ name: string, batteryLevel: number }> {
    try {
      // Check if we're connected to a Fitbit account
      const isConnected = await this.isConnected();
      
      if (isConnected) {
        console.log('Getting device info from Fitbit API');
        // Try to get device info from API
        const deviceInfo = await FitbitAuthService.getDeviceInfo();
        if (deviceInfo) {
          console.log('Got device info from API:', deviceInfo);
          return deviceInfo;
        }
        
        // If API fails but we have a stored device
        const device = await this.getConnectedDevice();
        if (device && device.batteryLevel) {
          console.log('Using stored device info:', device);
          return {
            name: device.name,
            batteryLevel: device.batteryLevel
          };
        }
      }
      
      // Return simulated data if no real device info is available
      const simulatedDeviceInfo = {
        name: 'Fitbit Sense',
        batteryLevel: Math.floor(Math.random() * 100),
      };
      console.log('Using simulated device info:', simulatedDeviceInfo);
      return simulatedDeviceInfo;
    } catch (error) {
      console.error('Error getting device info:', error);
      
      // Return simulated data on error
      return {
        name: 'Fitbit Sense',
        batteryLevel: Math.floor(Math.random() * 100),
      };
    }
  }
  
  /**
   * Scan for devices
   * This is a simulated method for UI consistency
   */
  static async scanForDevices(): Promise<FitbitDevice[]> {
    console.log('Scanning for Fitbit devices (simulated)');
    
    // Return simulated devices
    return [
      {
        id: 'fitbit-123456',
        name: 'Fitbit Sense',
        batteryLevel: 85,
      },
      {
        id: 'fitbit-789012',
        name: 'Fitbit Versa 3',
        batteryLevel: 72,
      },
      {
        id: 'fitbit-345678',
        name: 'Fitbit Charge 5',
        batteryLevel: 63,
      },
    ];
  }
  
  /**
   * Connect to a specific device
   * This is a simulated method for UI consistency
   */
  static async connectToDevice(deviceId: string): Promise<FitbitDevice> {
    console.log('Connecting to device:', deviceId);
    
    // Find the device in our simulated list
    const devices = await this.scanForDevices();
    const device = devices.find(d => d.id === deviceId);
    
    if (!device) {
      throw new Error(`Device with ID ${deviceId} not found`);
    }
    
    // Store the connected device
    this.connectedDevice = device;
    
    // Simulate an authorization
    await this.authorize();
    
    return device;
  }
}

export default HeartRateService;