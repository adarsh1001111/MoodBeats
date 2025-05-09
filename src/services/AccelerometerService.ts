import { Accelerometer, Gyroscope } from 'expo-sensors';
import EnhancedMoodPredictionService, { AccelerometerData } from './EnhancedMoodPredictionService';

/**
 * AccelerometerService
 * 
 * Handles accelerometer and gyroscope data collection and integration with mood prediction
 */
class AccelerometerService {
  private static isInitialized: boolean = false;
  private static accelerometerSubscription: ReturnType<typeof Accelerometer.addListener> | null = null;
  private static gyroscopeSubscription: ReturnType<typeof Gyroscope.addListener> | null = null;
  private static updateInterval: number = 100; // 10 times per second
  
  /**
   * Initialize the accelerometer service
   * @param updateInterval Optional update interval in ms
   */
  static async initialize(updateInterval?: number): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }
    
    try {
      // Set update interval if provided
      if (updateInterval) {
        this.updateInterval = updateInterval;
      }
      
      // Check if accelerometer is available
      const accelerometerAvailable = await Accelerometer.isAvailableAsync();
      const gyroscopeAvailable = await Gyroscope.isAvailableAsync();
      
      if (accelerometerAvailable) {
        // Set up accelerometer subscription
        Accelerometer.setUpdateInterval(this.updateInterval);
        this.accelerometerSubscription = Accelerometer.addListener(data => {
          // Add timestamp to data
          const timestampedData: AccelerometerData = {
            ...data,
            timestamp: Date.now()
          };
          
          // Send to EnhancedMoodPredictionService
          EnhancedMoodPredictionService.addAccelerometerData(timestampedData);
        });
      }
      
      if (gyroscopeAvailable) {
        // Set up gyroscope (for future use)
        Gyroscope.setUpdateInterval(this.updateInterval);
        this.gyroscopeSubscription = Gyroscope.addListener(data => {
          // We could use this later if needed
        });
      }
      
      this.isInitialized = true;
      return accelerometerAvailable;
    } catch (error) {
      console.error('Error initializing AccelerometerService:', error);
      return false;
    }
  }
  
  /**
   * Check if accelerometer is available
   */
  static async isAvailable(): Promise<boolean> {
    return await Accelerometer.isAvailableAsync();
  }
  
  /**
   * Get current accelerometer data
   */
  static async getCurrentData(): Promise<AccelerometerData | null> {
    try {
      const isAvailable = await this.isAvailable();
      
      if (!isAvailable) {
        return null;
      }
      
      return new Promise((resolve) => {
        Accelerometer.addListener((data) => {
          // Add timestamp and resolve
          resolve({
            ...data,
            timestamp: Date.now()
          });
          
          // Remove this temporary listener
          Accelerometer.removeAllListeners();
        });
      });
    } catch (error) {
      console.error('Error getting current accelerometer data:', error);
      return null;
    }
  }
  
  /**
   * Start collecting accelerometer data
   */
  static async start(): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    return this.isInitialized;
  }
  
  /**
   * Stop collecting accelerometer data
   */
  static stop(): void {
    if (this.accelerometerSubscription) {
      this.accelerometerSubscription.remove();
      this.accelerometerSubscription = null;
    }
    
    if (this.gyroscopeSubscription) {
      this.gyroscopeSubscription.remove();
      this.gyroscopeSubscription = null;
    }
    
    this.isInitialized = false;
  }
  
  /**
   * Clear collected accelerometer data
   */
  static clear(): void {
    EnhancedMoodPredictionService.clearAccelerometerCache();
  }
}

export default AccelerometerService;