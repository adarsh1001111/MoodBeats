import AsyncStorage from '@react-native-async-storage/async-storage';
import { MoodType } from './MoodFolderService';
import HeartRateService from './HeartRateService';
import MLModelService from './MLModelService';

// Define the mood prediction method types
export type PredictionMethod = 'local' | 'ai-model';

// API endpoint for the Flask server with XGBoost model integration
// Will be retrieved from MLModelService

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
    // Use MLModelService to get the API URL
    return await MLModelService.getApiUrl();
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
        // Try to auto-detect the API URL
        try {
          const detectedUrl = await MLModelService.autoDetectApiUrl();
          console.log(`Auto-detected API URL: ${detectedUrl}`);
          // Check if the auto-detected URL works
          const retryAvailable = await this.isAPIAvailable();
          console.log(`ML model API available after auto-detection: ${retryAvailable}`);
        } catch (e) {
          console.error('Error auto-detecting API URL:', e);
        }
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
      
      // Use MLModelService to predict mood
      try {
        const detailedPrediction = await MLModelService.getDetailedMoodPrediction(latestHR, accData);
        console.log('AI model prediction result:', detailedPrediction);
        
        // Convert the API response to our MoodType
        const moodMapping: { [key: string]: MoodType } = {
          'Happy': 'Happy',
          'Angry': 'Angry',
          'Sad': 'Sad',
          'Relaxed': 'Relaxed',
        };
        
        return moodMapping[detailedPrediction.primary_mood] || 'Happy'; // Default to Happy if mapping fails
      } catch (mlError) {
        console.error('Error using MLModelService for prediction:', mlError);
        
        // If MLModelService fails, fall back to direct API call
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
        console.log('AI model prediction result (direct API):', data);
        
        // Convert the API response to our MoodType
        const moodMapping: { [key: string]: MoodType } = {
          'Happy': 'Happy',
          'Angry': 'Angry',
          'Sad': 'Sad',
          'Relaxed': 'Relaxed',
        };
        
        return moodMapping[data.primary_mood] || 'Happy'; // Default to Happy if mapping fails
      }
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
      // Use MLModelService to get recommendations
      return await MLModelService.getSongRecommendations(mood);
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
      // Use MLModelService to get song details
      return await MLModelService.getSongDetails(songId);
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
      return await MLModelService.isApiAvailable();
    } catch (error) {
      console.error('ML API health check failed:', error);
      return false;
    }
  }
  
  /**
   * Analyze mood with both ML models, showing individual and combined predictions
   * @param heartRate Heart rate value
   * @returns Promise with detailed mood analysis
   */
  static async analyzeMoodWithML(heartRate: number): Promise<any> {
    try {
      // Try to get latest heart rate if we can
      let latestHR: number;
      try {
        latestHR = await HeartRateService.getLatestHeartRate();
        console.log('Using latest heart rate from API:', latestHR);
      } catch (err) {
        // Fallback to provided heart rate
        latestHR = heartRate;
        console.log('Using provided heart rate:', heartRate);
      }
      
      // Get accelerometer data from cache
      const accData = this.getAccelerometerData();
      
      // Use MLModelService to get combined prediction
      return await MLModelService.analyzeMoodWithBothModels(latestHR, accData);
    } catch (error) {
      console.error('Error analyzing mood with ML models:', error);
      
      // Fallback to local prediction
      let primaryMood: MoodType = 'Happy';
      let secondaryMood: MoodType = 'Relaxed';
      
      // Simple rules based on heart rate
      if (heartRate < 65) {
        primaryMood = 'Relaxed';
        secondaryMood = 'Sad';
      } else if (heartRate >= 65 && heartRate < 75) {
        primaryMood = 'Sad';
        secondaryMood = 'Relaxed';
      } else if (heartRate >= 75 && heartRate < 90) {
        primaryMood = 'Happy';
        secondaryMood = 'Relaxed';
      } else {
        primaryMood = 'Angry';
        secondaryMood = 'Happy';
      }
      
      // Return fallback prediction
      return {
        primaryMood,
        secondaryMood,
        confidence: {
          'Happy': primaryMood === 'Happy' ? 0.5 : 0.2,
          'Relaxed': primaryMood === 'Relaxed' ? 0.5 : 0.2,
          'Sad': primaryMood === 'Sad' ? 0.5 : 0.2,
          'Angry': primaryMood === 'Angry' ? 0.5 : 0.1
        },
        model1Prediction: primaryMood,
        model2Prediction: secondaryMood,
        heartRate: heartRate,
        timestamp: Date.now()
      };
    }
  }
}

export default EnhancedMoodPredictionService;