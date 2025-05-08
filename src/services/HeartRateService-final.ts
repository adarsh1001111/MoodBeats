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
      // Try to get Bluetooth heart rate data if available
      if (this.heartRateSource === 'bluetooth' && this.bluetoothModule) {
        const btHeartRateHistory = await this.bluetoothModule.getHeartRateHistory(limit);
        if (btHeartRateHistory && btHeartRateHistory.length > 0) {
          console.log('Got heart rate history from Bluetooth');
          return btHeartRateHistory;
        }
      }
      
      // Fall back to stored history
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
      // Check if we're connected to a Bluetooth device first
      if (this.heartRateSource === 'bluetooth' && this.bluetoothModule && this.bluetoothModule.isConnectedToDevice()) {
        console.log('Getting device info from Bluetooth device');
        const btDevice = this.bluetoothModule.getConnectedDevice();
        if (btDevice) {
          return {
            name: btDevice.name,
            batteryLevel: 100 // Most Bluetooth devices don't report battery
          };
        }
      }
      
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
        name: 'Heart Rate Device',
        batteryLevel: Math.floor(Math.random() * 100),
      };
      console.log('Using simulated device info:', simulatedDeviceInfo);
      return simulatedDeviceInfo;
    } catch (error) {
      console.error('Error getting device info:', error);
      
      // Return simulated data on error
      return {
        name: 'Heart Rate Device',
        batteryLevel: Math.floor(Math.random() * 100),
      };
    }
  }
  
  /**
   * Scan for devices
   * Uses Bluetooth scanning when available, falls back to simulated devices
   */
  static async scanForDevices(): Promise<FitbitDevice[]> {
    console.log('Scanning for heart rate devices');
    
    // Try to use Bluetooth scanning if available
    if (this.bluetoothModule) {
      try {
        // Start scanning for Bluetooth devices
        await this.bluetoothModule.scanForDevices();
        
        // Wait a moment for devices to be discovered
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Get discovered devices
        const btDevices = this.bluetoothModule.getDiscoveredDevices();
        
        if (btDevices && btDevices.length > 0) {
          console.log(`Found ${btDevices.length} Bluetooth devices`);
          
          // Convert Bluetooth devices to FitbitDevice format
          const devices = btDevices.map(device => ({
            id: device.id,
            name: device.name,
            batteryLevel: 100 // Default battery level for Bluetooth devices
          }));
          
          return devices;
        } else {
          console.log('No Bluetooth devices found, returning simulated devices');
        }
      } catch (error) {
        console.error('Error scanning for Bluetooth devices:', error);
      }
    }
    
    // Fall back to simulated devices
    console.log('Using simulated heart rate devices');
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
   * Uses Bluetooth connection when available, falls back to Fitbit API
   */
  static async connectToDevice(deviceId: string): Promise<FitbitDevice> {
    console.log('Connecting to device:', deviceId);
    
    // Try to connect using Bluetooth if available
    if (this.bluetoothModule) {
      try {
        // Check if this is a Bluetooth device ID format
        if (deviceId.startsWith('HR-') || deviceId.startsWith('MI-') || 
            deviceId.startsWith('FB-') || deviceId.startsWith('PL-')) {
          // This looks like a Bluetooth device ID
          console.log('Attempting to connect via Bluetooth');
          
          const success = await this.bluetoothModule.connectToDevice(deviceId);
          
          if (success) {
            console.log('Successfully connected to Bluetooth device');
            
            // Get the connected device
            const btDevice = this.bluetoothModule.getConnectedDevice();
            
            if (btDevice) {
              // Convert to FitbitDevice format
              const device: FitbitDevice = {
                id: btDevice.id,
                name: btDevice.name,
                batteryLevel: 100 // Default battery level
              };
              
              // Store the connected device
              this.connectedDevice = device;
              this.heartRateSource = 'bluetooth';
              
              // Stop simulation if it was running
              if (this.isSimulating) {
                this.stopSimulation();
              }
              
              return device;
            }
          } else {
            console.log('Failed to connect via Bluetooth, falling back to Fitbit API');
          }
        }
      } catch (error) {
        console.error('Error connecting via Bluetooth:', error);
      }
    }
    
    // Fall back to Fitbit API / simulation
    console.log('Connecting via Fitbit API / simulation');
    
    // Find the device in our devices list
    const devices = await this.scanForDevices();
    const device = devices.find(d => d.id === deviceId);
    
    if (!device) {
      throw new Error(`Device with ID ${deviceId} not found`);
    }
    
    // Store the connected device
    this.connectedDevice = device;
    
    // For Fitbit devices, try to authorize with the API
    if (deviceId.startsWith('fitbit-')) {
      await this.authorize();
      this.heartRateSource = 'fitbit';
    } else {
      // For other devices, start simulation
      this.startSimulation();
      this.heartRateSource = 'simulation';
    }
    
    return device;
  }
  
  /**
   * Get the current heart rate source
   */
  static getHeartRateSource(): string {
    return this.heartRateSource;
  }
  
  /**
   * Check if Bluetooth is available
   */
  static async isBluetoothAvailable(): Promise<boolean> {
    if (this.bluetoothModule) {
      return await this.bluetoothModule.isBluetoothAvailable();
    }
    return false;
  }
  
  /**
   * Connect directly to a Bluetooth device 
   */
  static async connectToBluetoothDevice(deviceId: string): Promise<boolean> {
    if (!this.bluetoothModule) {
      this.bluetoothModule = HeartRateBluetoothModule.getInstance();
      await this.bluetoothModule.initialize();
    }
    
    try {
      const success = await this.bluetoothModule.connectToDevice(deviceId);
      if (success) {
        console.log('Successfully connected to Bluetooth device');
        this.heartRateSource = 'bluetooth';
        
        // Stop simulation if it was running
        if (this.isSimulating) {
          this.stopSimulation();
        }
      }
      return success;
    } catch (error) {
      console.error('Error connecting to Bluetooth device:', error);
      return false;
    }
  }
}

export default HeartRateService;