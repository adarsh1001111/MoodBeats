import AsyncStorage from '@react-native-async-storage/async-storage';
import { MoodType } from './MoodFolderService';
import HeartRateService from './HeartRateService';

// Define the mood prediction method types
export type PredictionMethod = 'local' | 'ai-model';

// API endpoint for the Flask server with XGBoost model integration
// Replace this with your actual laptop's IP address
// e.g. 'http://192.168.1.123:5000/api'
const API_URL = 'http://192.168.29.142:5000/api';

// Define accelerometer data structure
export interface AccelerometerData {
  x: number;
  y: number;
  z: number;
  timestamp: number;
}

/**
 * Enhanced Mood Prediction Service
 * Supports both local simple predictions and AI model-based predictions
 */
class EnhancedMoodPredictionService {
  // Default prediction method
  private static predictionMethod: PredictionMethod = 'local';
  
  // Cache for accelerometer data
  private static accelerometerCache: AccelerometerData[] = [];
  private static maxCacheSize: number = 50; // Keep last 50 readings
  
  /**
   * Get the API endpoint for ML services
   * @returns Promise with the API endpoint URL
   */
  static async getApiEndpoint(): Promise<string> {
    // Try to get the stored API URL first
    try {
      const storedUrl = await AsyncStorage.getItem('ml_api_url');
      if (storedUrl) {
        return storedUrl;
      }
    } catch (error) {
      console.error('Error getting stored API URL:', error);
    }
    
    // Fall back to the default URL
    return API_URL;
  }
  
  /**
   * Set the prediction method to use
   * @param method 'local' or 'ai-model'
   */
  static async setPredictionMethod(method: PredictionMethod): Promise<void> {
    this.predictionMethod = method;
    await AsyncStorage.setItem('mood_prediction_method', method);
    console.log(`Set mood prediction method to: ${method}`);
    
    // If switching to ML model, check if API is available
    if (method === 'ai-model') {
    const isAvailable = await this.isAPIAvailable();
    console.log(`ML model API available: ${isAvailable}`);
    if (!isAvailable) {
    console.warn('ML model API is not available, falling back to local prediction');
        // Don't change the setting here, just warn the user
      }
    }
  }
  
  /**
   * Get the current prediction method
   * @returns The current prediction method
   */
  static async getPredictionMethod(): Promise<PredictionMethod> {
    const storedMethod = await AsyncStorage.getItem('mood_prediction_method');
    return (storedMethod as PredictionMethod) || this.predictionMethod;
  }
  
  /**
   * Add accelerometer data to the cache
   * @param data AccelerometerData object
   */
  static addAccelerometerData(data: AccelerometerData): void {
    this.accelerometerCache.push(data);
    
    // Keep the cache at maximum size
    if (this.accelerometerCache.length > this.maxCacheSize) {
      this.accelerometerCache.shift(); // Remove oldest entry
    }
  }
  
  /**
   * Get accelerometer data for AI model
   * @returns Array of [x, y, z] arrays
   */
  static getAccelerometerData(): number[][] {
    // Convert to the format expected by the API: [[x, y, z], [x, y, z], ...]
    return this.accelerometerCache.map(reading => [reading.x, reading.y, reading.z]);
  }
  
  /**
   * Clear the accelerometer cache
   */
  static clearAccelerometerCache(): void {
    this.accelerometerCache = [];
  }
  
  /**
   * Predict mood based on heart rate
   * Uses either local simple prediction or AI model-based prediction
   * @param heartRate Heart rate value
   * @returns Promise with the predicted mood
   */
  static async predictMood(heartRate: number): Promise<MoodType> {
    try {
      const method = await this.getPredictionMethod();
      
      if (method === 'ai-model') {
        console.log('Using ML model prediction');
        return await this.predictWithAIModel(heartRate);
      } else {
        console.log('Using local prediction');
        return this.predictWithLocalRules(heartRate);
      }
    } catch (error) {
      console.error('Error predicting mood:', error);
      // Fallback to local prediction on error
      return this.predictWithLocalRules(heartRate);
    }
  }
  
  /**
   * Predict mood using local simple rules
   * @param heartRate Heart rate value
   * @returns Predicted mood
   */
  static predictWithLocalRules(heartRate: number): MoodType {
    // Simple rules based on heart rate ranges
    if (heartRate < 65) {
      return 'Relaxed';
    } else if (heartRate >= 65 && heartRate < 75) {
      return 'Sad';
    } else if (heartRate >= 75 && heartRate < 90) {
      return 'Happy';
    } else {
      return 'Angry';
    }
  }
  
  /**
 * Predict mood using the ML model via Flask server API
 * @param heartRate Heart rate value
 * @returns Promise with the predicted mood
 */
  static async predictWithAIModel(heartRate: number): Promise<MoodType> {
    try {
      // Always try to get the freshest heart rate data
      let latestHR: number;
      try {
        latestHR = await HeartRateService.getLatestHeartRate();
        console.log('Using latest heart rate from API:', latestHR);
      } catch (err) {
        // Fallback to provided heart rate if we can't get a fresh one
        latestHR = heartRate;
        console.log('Using provided heart rate:', heartRate);
      }

      // Get accelerometer data from cache
      const accData = this.getAccelerometerData();
      
      console.log(`Sending prediction request with HR: ${latestHR} and ${accData.length} acc readings`);
      
      // Get the API endpoint
      const apiEndpoint = await this.getApiEndpoint();
      
      const response = await fetch(`${apiEndpoint}/predict-mood`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          heart_rate: latestHR,
          accelerometer: accData
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('AI model prediction result:', data);
      
      // Convert the API response to our MoodType
      const moodMapping: { [key: string]: MoodType } = {
        'Happy': 'Happy',
        'Angry': 'Angry',
        'Sad': 'Sad',
        'Relaxed': 'Relaxed',
      };
      
      return moodMapping[data.primary_mood] || 'Happy'; // Default to Happy if mapping fails
    } catch (error) {
      console.error('Error calling prediction API:', error);
      // Fallback to local prediction on API error
      return this.predictWithLocalRules(heartRate);
    }
  }
  
  /**
   * Get song recommendations for a mood
   * @param mood The mood to get recommendations for
   * @returns Promise with an array of songs
   */
  static async getSongRecommendations(mood: MoodType): Promise<any[]> {
    try {
      // Get the API endpoint
      const apiEndpoint = await this.getApiEndpoint();
      
      const response = await fetch(`${apiEndpoint}/recommend-songs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mood }),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Song recommendations:', data);
      
      return data.recommendations || [];
    } catch (error) {
      console.error('Error getting song recommendations:', error);
      return [];
    }
  }
  
  /**
   * Get song details
   * @param songId The song ID
   * @returns Promise with the song details
   */
  static async getSongDetails(songId: number): Promise<any> {
    try {
      // Get the API endpoint
      const apiEndpoint = await this.getApiEndpoint();
      
      const response = await fetch(`${apiEndpoint}/song-details/${songId}`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Song details:', data);
      
      return data;
    } catch (error) {
      console.error('Error getting song details:', error);
      return null;
    }
  }
  
  /**
   * Check if the API server is available
   * @returns Promise with a boolean indicating if the server is available
   */
  static async isAPIAvailable(): Promise<boolean> {
    try {
      // Get the API endpoint
      const apiEndpoint = await this.getApiEndpoint();
      
      const response = await fetch(`${apiEndpoint}/health`, { method: 'GET' });
      const data = await response.json();
      console.log('ML API health status:', data);
      return response.ok && data.model1 === 'loaded';
    } catch (error) {
      console.error('ML API health check failed:', error);
      return false;
    }
  }
}

export default EnhancedMoodPredictionService;