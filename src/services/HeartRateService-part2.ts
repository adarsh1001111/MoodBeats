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
    console.log('Disconnecting heart rate device');
    
    // Stop monitoring if it was running
    if (this.isMonitoring) {
      this.stopMonitoring();
    }
    
    // Check if we're connected via Bluetooth
    if (this.heartRateSource === 'bluetooth' && this.bluetoothModule) {
      try {
        console.log('Disconnecting Bluetooth device');
        await this.bluetoothModule.disconnectDevice();
      } catch (error) {
        console.error('Error disconnecting Bluetooth device:', error);
      }
    } else if (this.heartRateSource === 'fitbit') {
      // Disconnect from Fitbit
      console.log('Disconnecting Fitbit device');
      await FitbitAuthService.disconnectDevice();
    }
    
    // Reset device and source
    this.connectedDevice = null;
    this.heartRateSource = 'simulation';
    
    // Start simulation since we're no longer connected
    this.startSimulation();
    
    console.log('Device disconnected, simulation started');
  }
  
  /**
   * Check if currently connected/authorized
   */
  static async isConnected(): Promise<boolean> {
    // Check if connected to a Bluetooth device first
    if (this.heartRateSource === 'bluetooth' && this.bluetoothModule) {
      const isBluetoothConnected = this.bluetoothModule.isConnectedToDevice();
      if (isBluetoothConnected) {
        return true;
      }
    }
    
    // Fall back to Fitbit connection check
    const connected = await FitbitAuthService.isConnected();
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
