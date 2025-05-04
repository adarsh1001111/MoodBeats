import AsyncStorage from '@react-native-async-storage/async-storage';

// Constants
const MOOD_HISTORY_KEY = 'mood_history';

// Default mood ranges based on heart rate patterns
const MOOD_RANGES: Record<string, { min: number; max: number }> = {
  'Relaxed': { min: 60, max: 70 },
  'Calm': { min: 70, max: 80 },
  'Focused': { min: 80, max: 90 },
  'Happy': { min: 90, max: 100 },
  'Energetic': { min: 100, max: 120 },
  'Excited': { min: 120, max: 140 },
};

// Define interfaces for our data
export interface MoodEntry {
  mood: string;
  heartRate: number;
  timestamp: number;
}

export interface ContextData {
  timeOfDay?: string;
  dayOfWeek?: number;
  recentMoods?: string[];
  activityLevel?: string;
}

/**
 * Mood Prediction Service
 * Uses heart rate data to predict current mood
 */
class MoodPredictionService {
  /**
   * Predict mood based on heart rate
   * @param heartRate - Current heart rate in BPM
   * @returns Promise<string> - Predicted mood
   */
  static async predictMood(heartRate: number): Promise<string> {
    try {
      // Use basic prediction algorithm
      const basicMood = this._basicMoodPrediction(heartRate);
      this._storeMoodPrediction(basicMood, heartRate);
      return basicMood;
    } catch (error) {
      console.error('Error predicting mood:', error);
      // Use basic prediction as fallback
      const fallbackMood = this._basicMoodPrediction(heartRate);
      return fallbackMood;
    }
  }
  
  /**
   * Get mood history
   * @param limit - Maximum number of entries to return
   * @returns Promise<Array<MoodEntry>> - Array of mood entries with timestamps
   */
  static async getMoodHistory(limit = 10): Promise<MoodEntry[]> {
    try {
      const historyJson = await AsyncStorage.getItem(MOOD_HISTORY_KEY);
      
      if (!historyJson) {
        return [];
      }
      
      const history: MoodEntry[] = JSON.parse(historyJson);
      
      // Return most recent entries up to limit
      return history.slice(-limit);
    } catch (error) {
      console.error('Error getting mood history:', error);
      return [];
    }
  }
  
  /**
   * Basic mood prediction based on heart rate ranges
   * @private
   */
  static _basicMoodPrediction(heartRate: number): string {
    // Default mood if heart rate is outside all ranges
    let currentMood = 'Calm';
    
    // Find matching mood range
    for (const [mood, range] of Object.entries(MOOD_RANGES)) {
      if (heartRate >= range.min && heartRate < range.max) {
        currentMood = mood;
        break;
      }
    }
    
    // Handle extreme values
    if (heartRate < 60) {
      currentMood = 'Relaxed';
    } else if (heartRate >= 140) {
      currentMood = 'Excited';
    }
    
    return currentMood;
  }
  
  /**
   * Store mood prediction in history
   * @private
   */
  static async _storeMoodPrediction(mood: string, heartRate: number): Promise<void> {
    try {
      // Get existing history
      const historyJson = await AsyncStorage.getItem(MOOD_HISTORY_KEY);
      let history: MoodEntry[] = historyJson ? JSON.parse(historyJson) : [];
      
      // Add new mood prediction with timestamp and heart rate
      history.push({
        mood,
        heartRate,
        timestamp: Date.now(),
      });
      
      // Keep only last 100 predictions
      if (history.length > 100) {
        history = history.slice(-100);
      }
      
      // Store updated history
      await AsyncStorage.setItem(MOOD_HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Error storing mood prediction:', error);
    }
  }
  
  /**
   * Get additional context data for more accurate mood prediction
   * @private
   */
  static _getContextData(): ContextData {
    // Time of day
    const now = new Date();
    const hour = now.getHours();
    const timeOfDay = hour < 6 ? 'night' : 
                     hour < 12 ? 'morning' :
                     hour < 18 ? 'afternoon' : 'evening';
    
    // Day of week
    const dayOfWeek = now.getDay();
    
    // Activity level (in a real app, you might get this from HealthKit/Google Fit)
    const activityLevel = 'moderate'; // Default value
    
    return {
      timeOfDay,
      dayOfWeek,
      activityLevel,
    };
  }
}

export default MoodPredictionService;
