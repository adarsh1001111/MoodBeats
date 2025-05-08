import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import EnhancedMoodPredictionService from '../services/EnhancedMoodPredictionService';
import HeartRateService from '../services/HeartRateService';
import { Accelerometer } from 'expo-sensors';

interface MoodData {
  primary_mood: string;
  secondary_mood: string;
  confidence: Record<string, number>;
  model1_prediction?: string;
  model2_prediction?: string;
}

const MoodAnalytics: React.FC = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [heartRate, setHeartRate] = useState<number | null>(null);
  const [predictionMethod, setPredictionMethod] = useState<'local' | 'ai-model'>('local');
  const [accelerometerData, setAccelerometerData] = useState<{x: number; y: number; z: number}>({ x: 0, y: 0, z: 0 });
  const [moodData, setMoodData] = useState<MoodData | null>(null);
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    // Get the current prediction method
    const loadPredictionMethod = async () => {
      const method = await EnhancedMoodPredictionService.getPredictionMethod();
      setPredictionMethod(method);
    };
    
    loadPredictionMethod();
    
    // Clean up
    return () => {
      unsubscribeAccelerometer();
    };
  }, []);

  const subscribeAccelerometer = () => {
    setSubscription(
      Accelerometer.addListener(accelerometerData => {
        setAccelerometerData(accelerometerData);
        
        // Add to the service cache
        EnhancedMoodPredictionService.addAccelerometerData({
          ...accelerometerData,
          timestamp: Date.now()
        });
      })
    );
    
    Accelerometer.setUpdateInterval(500);
  };

  const unsubscribeAccelerometer = () => {
    subscription && subscription.remove();
    setSubscription(null);
    EnhancedMoodPredictionService.clearAccelerometerCache();
  };

  const analyzeMood = async () => {
    try {
      setIsAnalyzing(true);
      setMoodData(null);
      
      // Start collecting accelerometer data
      subscribeAccelerometer();
      
      // Get heart rate data - PRIORITIZE Fitbit data
      let hr: number;
      
      try {
        // First try to get the LATEST reading from Fitbit
        hr = await HeartRateService.getLatestHeartRate();  // Get the latest heart rate directly
        console.log('Using actual Fitbit heart rate:', hr);
      } catch (error) {
        console.log('Error getting heart rate from Fitbit, using simulated data');
        // If failed, use a simulated value
        hr = Math.floor(Math.random() * (100 - 65) + 65);
        console.log('Using simulated heart rate:', hr);
      }
      
      setHeartRate(hr);
      
      // Collect accelerometer data for 3 seconds
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Make the prediction
      if (predictionMethod === 'ai-model') {
        // Check if API is available
        const isApiAvailable = await EnhancedMoodPredictionService.isAPIAvailable();
        
        if (!isApiAvailable) {
          throw new Error('ML server is not available');
        }
        
        // Make API prediction
        try {
        // Use the service's API_URL instead of hardcoding localhost
            const apiEndpoint = await EnhancedMoodPredictionService.getApiEndpoint();
            const response = await fetch(`${apiEndpoint}/predict-mood`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              heart_rate: hr,
              accelerometer: EnhancedMoodPredictionService.getAccelerometerData()
            }),
          });
          
          if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
          }
          
          const data = await response.json();
          setMoodData(data);
        } catch (error) {
          console.error('Error calling prediction API:', error);
          // Fallback to local prediction
          const mood = EnhancedMoodPredictionService.predictWithLocalRules(hr);
          
          // Create a simplified mood data structure for local prediction
          setMoodData({
            primary_mood: mood,
            secondary_mood: getMoodFromHeartRate(hr, mood),
            confidence: {
              [mood]: 0.8,
              [getMoodFromHeartRate(hr, mood)]: 0.2,
              'Happy': mood === 'Happy' ? 0.8 : 0.1,
              'Sad': mood === 'Sad' ? 0.8 : 0.1,
              'Angry': mood === 'Angry' ? 0.8 : 0.1,
              'Relaxed': mood === 'Relaxed' ? 0.8 : 0.1,
            }
          });
        }
      } else {
        // Use local prediction
        const mood = EnhancedMoodPredictionService.predictWithLocalRules(hr);
        
        // Create a simplified mood data structure for local prediction
        setMoodData({
          primary_mood: mood,
          secondary_mood: getMoodFromHeartRate(hr, mood),
          confidence: {
            [mood]: 0.8,
            [getMoodFromHeartRate(hr, mood)]: 0.2,
            'Happy': mood === 'Happy' ? 0.8 : 0.1,
            'Sad': mood === 'Sad' ? 0.8 : 0.1,
            'Angry': mood === 'Angry' ? 0.8 : 0.1,
            'Relaxed': mood === 'Relaxed' ? 0.8 : 0.1,
          }
        });
      }
    } catch (error) {
      console.error('Error analyzing mood:', error);
      alert(`Failed to analyze mood: ${error}`);
    } finally {
      unsubscribeAccelerometer();
      setIsAnalyzing(false);
    }
  };
  
  // Helper function to get a secondary mood
  const getMoodFromHeartRate = (hr: number, excludeMood: string): string => {
    const moods = ['Happy', 'Sad', 'Angry', 'Relaxed'].filter(m => m !== excludeMood);
    if (hr < 65) return moods.includes('Relaxed') ? 'Relaxed' : moods[0];
    if (hr >= 65 && hr < 75) return moods.includes('Sad') ? 'Sad' : moods[0];
    if (hr >= 75 && hr < 90) return moods.includes('Happy') ? 'Happy' : moods[0];
    return moods.includes('Angry') ? 'Angry' : moods[0];
  };

  // Colors for different moods
  const moodColors: Record<string, string> = {
    Happy: '#4CAF50',
    Sad: '#2196F3',
    Angry: '#F44336',
    Relaxed: '#9C27B0',
  };

  const renderMoodData = () => {
    if (!moodData) return null;
    
    const { primary_mood, secondary_mood, confidence, model1_prediction, model2_prediction } = moodData;
    const sortedMoods = Object.entries(confidence)
      .sort(([, valueA], [, valueB]) => valueB - valueA);
    
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Mood Analysis</Text>
          {heartRate && <Text style={styles.cardSubtitle}>Heart Rate: {heartRate} BPM</Text>}
        </View>
        
        <View style={styles.cardContent}>
          <View style={styles.moodContainer}>
            <Text style={styles.primaryMood}>
              <Text style={styles.moodLabel}>Primary Mood:</Text> 
              <Text style={[styles.moodText, { color: moodColors[primary_mood] || '#000' }]}>
                {' ' + primary_mood}
              </Text>
            </Text>
            
            <Text style={styles.secondaryMood}>
              <Text style={styles.moodLabel}>Secondary Mood:</Text>
              <Text style={[styles.moodText, { color: moodColors[secondary_mood] || '#000' }]}>
                {' ' + secondary_mood}
              </Text>
            </Text>
          </View>
          
          <View style={styles.separator} />
          
          <Text style={styles.sectionTitle}>Confidence Scores:</Text>
          {sortedMoods.map(([mood, score]) => (
            <View key={mood} style={styles.confidenceRow}>
              <Text style={styles.confidenceLabel}>{mood}</Text>
              <View style={styles.progressContainer}>
                <View style={styles.progressBackground}>
                  <View 
                    style={[styles.progressFill, 
                      {width: `${Math.round(score * 100)}%`, backgroundColor: moodColors[mood] || '#6200ea'}]} 
                  />
                </View>
                <Text style={styles.confidenceValue}>{Math.round(score * 100)}%</Text>
              </View>
            </View>
          ))}
          
          {model1_prediction && model2_prediction && (
            <>
              <View style={styles.separator} />
              <Text style={styles.sectionTitle}>Model Predictions:</Text>
              <View style={styles.modelContainer}>
                <View style={styles.modelBox}>
                  <Text style={styles.modelLabel}>Model 1</Text>
                  <Text style={[styles.modelPrediction, { color: moodColors[model1_prediction] || '#000' }]}>
                    {model1_prediction}
                  </Text>
                </View>
                <View style={styles.modelBox}>
                  <Text style={styles.modelLabel}>Model 2</Text>
                  <Text style={[styles.modelPrediction, { color: moodColors[model2_prediction] || '#000' }]}>
                    {model2_prediction}
                  </Text>
                </View>
              </View>
            </>
          )}
          
          <Text style={styles.methodNote}>
            Using {predictionMethod === 'local' ? 'basic algorithm' : 'ML model'} for prediction
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {!isAnalyzing && !moodData && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Mood Analysis</Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.introText}>
              Analyze your current mood based on heart rate and movement patterns.
            </Text>
            <Text style={styles.methodText}>
              Current method: {predictionMethod === 'local' ? 'Basic Algorithm' : 'ML Model'}
            </Text>
            <TouchableOpacity 
              style={styles.analyzeButton}
              onPress={analyzeMood}
            >
              <Ionicons name="analytics-outline" size={20} color="#fff" style={{marginRight: 8}} />
              <Text style={styles.analyzeButtonText}>Analyze My Mood</Text>
            </TouchableOpacity>
            <Text style={styles.settingsHint}>
              You can change the prediction method in Settings
            </Text>
          </View>
        </View>
      )}
      
      {isAnalyzing && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Analyzing Mood</Text>
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6200ea" />
            <Text style={styles.loadingText}>
              Collecting biometric data...
            </Text>
            {heartRate && (
              <Text style={styles.heartRateText}>
                Heart Rate: {heartRate} BPM
              </Text>
            )}
            <Text style={styles.accelText}>
              Movement: x={accelerometerData.x.toFixed(2)}, y={accelerometerData.y.toFixed(2)}, z={accelerometerData.z.toFixed(2)}
            </Text>
          </View>
        </View>
      )}
      
      {renderMoodData()}
      
      {moodData && (
        <TouchableOpacity style={styles.retryButton} onPress={analyzeMood}>
          <Ionicons name="refresh" size={18} color="#fff" />
          <Text style={styles.retryText}>Analyze Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4,
  },
  cardContent: {
    padding: 16,
  },
  introText: {
    fontSize: 16,
    marginBottom: 16,
    color: '#555',
  },
  methodText: {
    fontSize: 14,
    marginBottom: 16,
    color: '#666',
  },
  settingsHint: {
    fontSize: 12,
    color: '#888',
    marginTop: 8,
    textAlign: 'center',
  },
  analyzeButton: {
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: '#6200ea',
    flexDirection: 'row',
    padding: 12,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#555',
  },
  heartRateText: {
    marginTop: 8,
    fontSize: 14,
    color: '#e91e63',
  },
  accelText: {
    marginTop: 8,
    fontSize: 12,
    color: '#777',
  },
  moodContainer: {
    marginBottom: 16,
  },
  primaryMood: {
    fontSize: 18,
    marginBottom: 8,
  },
  secondaryMood: {
    fontSize: 16,
    marginBottom: 8,
  },
  moodLabel: {
    fontWeight: 'normal',
    color: '#555',
  },
  moodText: {
    fontWeight: 'bold',
  },
  separator: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  confidenceLabel: {
    width: 70,
    fontSize: 14,
    color: '#555',
  },
  progressContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBackground: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    borderRadius: 4,
  },
  confidenceValue: {
    width: 40,
    textAlign: 'right',
    fontSize: 12,
    marginLeft: 8,
    color: '#555',
  },
  modelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  modelBox: {
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 4,
    width: '48%',
    alignItems: 'center',
  },
  modelLabel: {
    fontSize: 14,
    marginBottom: 4,
    color: '#555',
  },
  modelPrediction: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  methodNote: {
    marginTop: 16,
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  retryButton: {
    backgroundColor: '#6200ea',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 4,
    marginTop: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default MoodAnalytics;
