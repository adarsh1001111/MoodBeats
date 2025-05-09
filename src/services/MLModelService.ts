import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MoodType } from './MoodFolderService';

/**
 * MLModelService
 * 
 * Handles the configuration and settings for ML model integration
 */
class MLModelService {
  // Default API URL
  private static defaultApiUrl = 'http://localhost:5000/api';
  
  // Get the API URL for ML services
  static async getApiUrl(): Promise<string> {
    try {
      const storedUrl = await AsyncStorage.getItem('ml_api_url');
      if (storedUrl) {
        return storedUrl;
      }
    } catch (error) {
      console.error('Error retrieving API URL:', error);
    }
    
    return this.defaultApiUrl;
  }
  
  // Set the API URL for ML services
  static async setApiUrl(url: string): Promise<void> {
    try {
      await AsyncStorage.setItem('ml_api_url', url);
      console.log(`API URL set to: ${url}`);
    } catch (error) {
      console.error('Error saving API URL:', error);
    }
  }
  
  // Reset the API URL to default
  static async resetApiUrl(): Promise<void> {
    try {
      await AsyncStorage.removeItem('ml_api_url');
      console.log(`API URL reset to default: ${this.defaultApiUrl}`);
    } catch (error) {
      console.error('Error resetting API URL:', error);
    }
  }
  
  // Check if the ML API is available
  static async isApiAvailable(): Promise<boolean> {
    try {
      const apiUrl = await this.getApiUrl();
      const response = await fetch(`${apiUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        return false;
      }
      
      const data = await response.json();
      return data.status === 'ok' && data.model1 === 'loaded';
    } catch (error) {
      console.error('Error checking ML API availability:', error);
      return false;
    }
  }
  
  // Detect the local IP address for the API
  static detectLocalIp(): string {
    // In a real app, we would use network information to detect the IP
    // Since we can't do that in this simplified example, we'll return a default
    
    // Common emulator/simulator mappings
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:5000/api'; // Android emulator maps this to host's localhost
    } else if (Platform.OS === 'ios') {
      return 'http://localhost:5000/api'; // iOS simulator can use localhost directly
    }
    
    // Real device would use the computer's actual IP address
    // For demo purposes, we'll use a placeholder IP
    return 'http://192.168.29.142:5000/api';
  }
  
  // Set API URL to auto-detected value
  static async autoDetectApiUrl(): Promise<string> {
    const detectedUrl = this.detectLocalIp();
    await this.setApiUrl(detectedUrl);
    return detectedUrl;
  }
  
  // Get song recommendations for a mood
  static async getSongRecommendations(mood: MoodType): Promise<any[]> {
    try {
      const apiUrl = await this.getApiUrl();
      
      const response = await fetch(`${apiUrl}/recommend-songs`, {
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
      return data.recommendations || [];
    } catch (error) {
      console.error('Error getting song recommendations:', error);
      return [];
    }
  }
  
  // Predict mood with ML model
  static async predictMood(heartRate: number, accelerometerData: any[]): Promise<MoodType> {
    try {
      const apiUrl = await this.getApiUrl();
      
      const response = await fetch(`${apiUrl}/predict-mood`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          heart_rate: heartRate,
          accelerometer: accelerometerData
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      return data.primary_mood as MoodType;
    } catch (error) {
      console.error('Error predicting mood with ML model:', error);
      
      // Default fallback to Happy mood
      return 'Happy';
    }
  }
  
  // Get detailed mood prediction with confidence scores, explicitly showing both models
  static async getDetailedMoodPrediction(heartRate: number, accelerometerData: any[]): Promise<any> {
    try {
      const apiUrl = await this.getApiUrl();
      
      const response = await fetch(`${apiUrl}/predict-mood`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          heart_rate: heartRate,
          accelerometer: accelerometerData
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error getting detailed mood prediction:', error);
      
      // Return a default response
      return {
        primary_mood: 'Happy',
        secondary_mood: 'Relaxed',
        confidence: {
          'Happy': 0.4,
          'Relaxed': 0.3,
          'Sad': 0.2,
          'Angry': 0.1
        }
      };
    }
  }
  
  // Get song details by ID
  static async getSongDetails(songId: number): Promise<any> {
    try {
      const apiUrl = await this.getApiUrl();
      
      const response = await fetch(`${apiUrl}/song-details/${songId}`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error getting song details:', error);
      return null;
    }
  }
  
  /**
   * Analyze mood explicitly using both ML models, showing combined results and individual model predictions
   * @param heartRate Current heart rate value
   * @param accelerometerData Accelerometer readings
   * @returns Promise with detailed mood analysis
   */
  static async analyzeMoodWithBothModels(heartRate: number, accelerometerData: any[] = []): Promise<{
    primaryMood: MoodType;
    secondaryMood: MoodType;
    confidence: Record<MoodType, number>;
    model1Prediction: MoodType;
    model2Prediction: MoodType;
    heartRate: number;
    timestamp: number;
  }> {
    try {
      // Get detailed prediction from models
      const prediction = await this.getDetailedMoodPrediction(heartRate, accelerometerData);
      
      // Format the response in the expected structure
      return {
        primaryMood: prediction.primary_mood as MoodType,
        secondaryMood: prediction.secondary_mood as MoodType,
        confidence: prediction.confidence as Record<MoodType, number>,
        model1Prediction: prediction.model1_prediction as MoodType,
        model2Prediction: prediction.model2_prediction as MoodType,
        heartRate: heartRate,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error analyzing mood with both models:', error);
      
      // Fallback to simple prediction
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

export default MLModelService;