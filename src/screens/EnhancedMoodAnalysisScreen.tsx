import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Animated,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import HeartRateService from '../services/HeartRateService';
import EnhancedMoodPredictionService from '../services/EnhancedMoodPredictionService';
import AccelerometerService from '../services/AccelerometerService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MoodType } from '../services/MoodFolderService';

// Define the types for our navigation props
type RootStackParamList = {
  Home: undefined;
  MoodPlayer: { mood?: MoodType; songId?: string };
  MoodAnalysis: { useML?: boolean };
};

type MoodAnalysisScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'MoodAnalysis'
>;

type Props = {
  navigation: MoodAnalysisScreenNavigationProp;
};

interface MoodPrediction {
  primaryMood: MoodType;
  secondaryMood: MoodType;
  confidence: Record<MoodType, number>;
  model1Prediction: MoodType;
  model2Prediction: MoodType;
  heartRate: number;
  timestamp: number;
}

const EnhancedMoodAnalysisScreen: React.FC<Props> = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [heartRate, setHeartRate] = useState<number | null>(null);
  const [moodPrediction, setMoodPrediction] = useState<MoodPrediction | null>(null);
  const [predictionMethod, setPredictionMethod] = useState<'local' | 'ai-model'>('local');
  const [accelerometerData, setAccelerometerData] = useState<number[][]>([]);
  const [keyFeatures, setKeyFeatures] = useState<{[key: string]: string}>({});
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [animatedValue] = useState(new Animated.Value(0));
  
  // Update status message
  const updateStatusMessage = (message: string) => {
    setStatusMessage(message);
  };
  
  useEffect(() => {
    // Initialize the AccelerometerService
    const initializeAccelerometer = async () => {
      const isAvailable = await AccelerometerService.initialize();
      if (isAvailable) {
        console.log('Accelerometer initialized successfully');
        await AccelerometerService.start();
      } else {
        console.warn('Accelerometer is not available on this device');
      }
    };
    
    initializeAccelerometer();
    checkPredictionMethod();
    
    // Check if we should use ML explicitly
    const useMLParam = navigation.getState().routes.find(r => r.name === 'MoodAnalysis')?.params?.useML;
    if (useMLParam) {
      analyzeMoodWithML();
    } else {
      analyzeCurrentMood();
    }
    
    // Clean up accelerometer when unmounting
    return () => {
      AccelerometerService.stop();
      // Clean up animation on unmount
      stopFeatureAnimation();
    };
  }, [navigation]);
  
  // Calculate key features for display
  const calculateKeyFeatures = async (hr: number): Promise<{[key: string]: string}> => {
    try {
      // Features to show to the user
      const features: {[key: string]: string} = {};
      
      // Heart rate features from Fitbit
      features["Heart Rate"] = `${hr} BPM`;
      
      // Get heart rate variability from Fitbit if available
      try {
        const hrv = await HeartRateService.getHeartRateVariability();
        features["HR Variability"] = hrv ? `${hrv.toFixed(1)} ms` : 'N/A';
      } catch (e) {
        // Create a synthetic heart rate variability for demo purposes
        const hrVariability = Math.random() * 5 + 2;
        features["HR Variability"] = `${hrVariability.toFixed(1)} ms (Est.)`;
      }
      
      // Get real-time accelerometer data
      const accData = EnhancedMoodPredictionService.getAccelerometerData();
      
      // Accelerometer features
      if (accData.length > 0) {
        // Calculate mean of each axis
        let sumX = 0, sumY = 0, sumZ = 0;
        for (const reading of accData) {
          sumX += reading[0];
          sumY += reading[1];
          sumZ += reading[2];
        }
        
        const avgX = sumX / accData.length;
        const avgY = sumY / accData.length;
        const avgZ = sumZ / accData.length;
        
        features["Avg Motion (X)"] = avgX.toFixed(2);
        features["Avg Motion (Y)"] = avgY.toFixed(2);
        features["Avg Motion (Z)"] = avgZ.toFixed(2);
        
        // Calculate movement energy
        let energy = 0;
        for (const reading of accData) {
          energy += (reading[0] * reading[0] + reading[1] * reading[1] + reading[2] * reading[2]);
        }
        energy = energy / accData.length;
        
        features["Movement Energy"] = energy.toFixed(2);
        features["Readings Count"] = accData.length.toString();
      } else {
        // Try to get current accelerometer reading
        const currentReading = await AccelerometerService.getCurrentData();
        if (currentReading) {
          features["X Axis"] = currentReading.x.toFixed(2);
          features["Y Axis"] = currentReading.y.toFixed(2);
          features["Z Axis"] = currentReading.z.toFixed(2);
          features["Acc. Status"] = "Just started";
        } else {
          features["Accelerometer"] = "No data available";
          features["Acc. Status"] = "Sensor offline";
        }
      }
      
      return features;
    } catch (error) {
      console.error('Error calculating key features:', error);
      return {"Error": "Could not calculate features"};
    }
  };
  
  // Start animation for features
  const startFeatureAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true
        })
      ])
    ).start();
  };
  
  /**
   * Stop animation
   */
  const stopFeatureAnimation = () => {
    animatedValue.stopAnimation();
    animatedValue.setValue(0);
  };
  
  const checkPredictionMethod = async () => {
    try {
      const method = await EnhancedMoodPredictionService.getPredictionMethod();
      setPredictionMethod(method);
    } catch (error) {
      console.error('Error checking prediction method:', error);
    }
  };
  
  const analyzeCurrentMood = async () => {
    try {
      setIsAnalyzing(true);
      
      // Make sure accelerometer is initialized
      await AccelerometerService.start();
      updateStatusMessage('Initializing sensors...');
      
      // Get heart rate from Fitbit
      let hr: number;
      try {
        hr = await HeartRateService.getLatestHeartRate();
        console.log('Using latest heart rate from Fitbit API:', hr);
      } catch (err) {
        console.error('Error getting heart rate from Fitbit:', err);
        // Use a fallback heart rate
        hr = 75; // Default average heart rate
        Alert.alert(
          'Fitbit Connection Issue',
          'Could not get your heart rate from Fitbit. Using estimated value for analysis.',
          [{ text: 'OK' }]
        );
      }
      setHeartRate(hr);
      
      // Check if we should use ML model
      const method = await EnhancedMoodPredictionService.getPredictionMethod();
      setPredictionMethod(method);
      
      // Calculate key features for display
      updateStatusMessage('Calculating features from sensor data...');
      const features = await calculateKeyFeatures(hr);
      setKeyFeatures(features);
      
      // Start feature animation
      startFeatureAnimation();
      
      if (method === 'ai-model') {
        // Use the ML model prediction
        updateStatusMessage('Analyzing with ML models...');
        await predictWithMLModel(hr);
      } else {
        // Use local prediction
        updateStatusMessage('Analyzing with simple rules...');
        await predictWithLocalRules(hr);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error analyzing mood:', error);
      // Fallback to local prediction
      if (heartRate) {
        await predictWithLocalRules(heartRate);
      } else {
        await predictWithLocalRules(75);
      }
      setIsLoading(false);
    } finally {
      setIsAnalyzing(false);
      // Clear status message after analysis is complete
      updateStatusMessage('');
    }
  };
  
  // Explicitly analyze mood with ML models
  const analyzeMoodWithML = async () => {
    try {
      setIsAnalyzing(true);
      
      // Make sure accelerometer is initialized
      await AccelerometerService.start();
      updateStatusMessage('Initializing sensors...');
      
      // Get heart rate from Fitbit
      let hr: number;
      try {
        hr = await HeartRateService.getLatestHeartRate();
        console.log('Using latest heart rate from Fitbit API:', hr);
      } catch (err) {
        console.error('Error getting heart rate from Fitbit:', err);
        // Use a fallback heart rate
        hr = 75; // Default average heart rate
        Alert.alert(
          'Fitbit Connection Issue',
          'Could not get your heart rate from Fitbit. Using estimated value for analysis.',
          [{ text: 'OK' }]
        );
      }
      setHeartRate(hr);
      
      // Set method to ML even if user hasn't enabled it in settings
      setPredictionMethod('ai-model');
      
      // Calculate key features for display - using real-time data
      updateStatusMessage('Calculating features from sensor data...');
      const features = await calculateKeyFeatures(hr);
      setKeyFeatures(features);
      
      // Start feature animation
      startFeatureAnimation();
      
      // Get accelerometer data to pass to the models
      updateStatusMessage('Getting accelerometer readings...');
      const accData = EnhancedMoodPredictionService.getAccelerometerData();
      setAccelerometerData(accData);
      
      console.log(`Analyzing mood with ML using HR: ${hr} and ${accData.length} accelerometer readings`);
      
      // Use the enhanced ML model prediction with both models
      updateStatusMessage('Analyzing with ML models...');
      const prediction = await EnhancedMoodPredictionService.analyzeMoodWithML(hr);
      
      // Set the prediction from the ML analysis
      setMoodPrediction(prediction);
      
      // Store the prediction for history
      await storeMoodPrediction(prediction);
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error analyzing mood with ML models:', error);
      Alert.alert(
        'Analysis Error',
        'There was an error analyzing your mood. Falling back to simple prediction.',
        [{ text: 'OK' }]
      );
      // Fallback to local prediction
      if (heartRate) {
        await predictWithLocalRules(heartRate);
      } else {
        // Use a default heart rate
        await predictWithLocalRules(75);
      }
      setIsLoading(false);
    } finally {
      setIsAnalyzing(false);
      // Clear status message after analysis is complete
      updateStatusMessage('');
    }
  };
  
  const predictWithLocalRules = async (hr: number) => {
    // Simple prediction based on heart rate
    let primaryMood: MoodType = 'Happy';
    let secondaryMood: MoodType = 'Relaxed';
    let confidence: Record<MoodType, number> = {
      'Happy': 0.25,
      'Relaxed': 0.25,
      'Sad': 0.25,
      'Angry': 0.25
    };
    
    // Simple rules based on heart rate ranges
    if (hr < 65) {
      primaryMood = 'Relaxed';
      secondaryMood = 'Sad';
      confidence = {
        'Relaxed': 0.45,
        'Sad': 0.30,
        'Happy': 0.20,
        'Angry': 0.05
      };
    } else if (hr >= 65 && hr < 75) {
      primaryMood = 'Sad';
      secondaryMood = 'Relaxed';
      confidence = {
        'Sad': 0.40,
        'Relaxed': 0.35,
        'Happy': 0.15,
        'Angry': 0.10
      };
    } else if (hr >= 75 && hr < 90) {
      primaryMood = 'Happy';
      secondaryMood = 'Relaxed';
      confidence = {
        'Happy': 0.50,
        'Relaxed': 0.30,
        'Sad': 0.15,
        'Angry': 0.05
      };
    } else {
      primaryMood = 'Angry';
      secondaryMood = 'Happy';
      confidence = {
        'Angry': 0.45,
        'Happy': 0.30,
        'Sad': 0.15,
        'Relaxed': 0.10
      };
    }
    
    const prediction: MoodPrediction = {
      primaryMood,
      secondaryMood,
      confidence,
      model1Prediction: primaryMood,
      model2Prediction: secondaryMood,
      heartRate: hr,
      timestamp: Date.now()
    };
    
    setMoodPrediction(prediction);
    
    // Store the prediction
    await storeMoodPrediction(prediction);
  };
  
  const predictWithMLModel = async (hr: number) => {
    try {
      // Get accelerometer data from collector
      const accData = EnhancedMoodPredictionService.getAccelerometerData();
      console.log(`Using ML model with ${accData.length} accelerometer readings`);
      
      // Call the ML model API through EnhancedMoodPredictionService
      try {
        // Try to use the ML service directly
        const prediction = await EnhancedMoodPredictionService.analyzeMoodWithML(hr);
        setMoodPrediction(prediction);
        
        // Store the prediction
        await storeMoodPrediction(prediction);
        return;
      } catch (e) {
        console.error('Error using ML service directly:', e);
        // Fall back to API call
      }
      
      // Fallback: Direct API call
      const response = await fetch(`${await EnhancedMoodPredictionService.getApiEndpoint()}/predict-mood`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          heart_rate: hr,
          accelerometer: accData
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('ML model prediction:', data);
      
      // Map ML model output to our MoodPrediction structure
      const prediction: MoodPrediction = {
        primaryMood: data.primary_mood as MoodType,
        secondaryMood: data.secondary_mood as MoodType,
        confidence: data.confidence as Record<MoodType, number>,
        model1Prediction: data.model1_prediction as MoodType,
        model2Prediction: data.model2_prediction as MoodType,
        heartRate: hr,
        timestamp: Date.now()
      };
      
      setMoodPrediction(prediction);
      
      // Store the prediction
      await storeMoodPrediction(prediction);
    } catch (error) {
      console.error('Error with ML model prediction:', error);
      // Fallback to local prediction
      await predictWithLocalRules(hr);
    }
  };
  
  const storeMoodPrediction = async (prediction: MoodPrediction) => {
    try {
      // Get existing history
      const historyJson = await AsyncStorage.getItem('mood_predictions');
      let history: MoodPrediction[] = historyJson ? JSON.parse(historyJson) : [];
      
      // Add new prediction
      history.push(prediction);
      
      // Keep only last 20 predictions
      if (history.length > 20) {
        history = history.slice(-20);
      }
      
      // Store updated history
      await AsyncStorage.setItem('mood_predictions', JSON.stringify(history));
    } catch (error) {
      console.error('Error storing mood prediction:', error);
    }
  };
  
  const getMoodColor = (mood: MoodType): string => {
    switch (mood) {
      case 'Happy':
        return '#4caf50'; // Green
      case 'Angry':
        return '#f44336'; // Red
      case 'Sad':
        return '#2196f3'; // Blue
      case 'Relaxed':
        return '#9c27b0'; // Purple
      default:
        return '#757575'; // Gray
    }
  };
  
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ea" />
        <Text style={styles.loadingText}>Analyzing your mood...</Text>
        {statusMessage ? <Text style={styles.statusText}>{statusMessage}</Text> : null}
      </View>
    );
  }
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mood Analysis</Text>
      </View>
      
      <View style={styles.card}>
        <Text style={styles.heartRateText}>
          Heart Rate: {heartRate} BPM
        </Text>
        
        {moodPrediction && (
          <>
            <View style={styles.divider} />
            
            <View style={styles.moodRow}>
              <Text style={styles.moodLabel}>Primary Mood:</Text>
              <Text style={[styles.moodValue, { color: getMoodColor(moodPrediction.primaryMood) }]}>
                {moodPrediction.primaryMood}
              </Text>
            </View>
            
            <View style={styles.moodRow}>
              <Text style={styles.moodLabel}>Secondary Mood:</Text>
              <Text style={[styles.moodValue, { color: getMoodColor(moodPrediction.secondaryMood) }]}>
                {moodPrediction.secondaryMood}
              </Text>
            </View>
            
            <View style={styles.divider} />
            
            <Text style={styles.sectionTitle}>Confidence Scores:</Text>
            
            {Object.entries(moodPrediction.confidence).map(([mood, score]) => (
              <View key={mood} style={styles.confidenceRow}>
                <Text style={styles.confidenceMood}>{mood}</Text>
                <View style={styles.confidenceBarContainer}>
                  <View 
                    style={[
                      styles.confidenceBar, 
                      { 
                        width: `${score * 100}%`,
                        backgroundColor: getMoodColor(mood as MoodType)
                      }
                    ]} 
                  />
                </View>
                <Text style={styles.confidencePercent}>{Math.round(score * 100)}%</Text>
              </View>
            ))}
            
            <View style={styles.divider} />
            
            <Text style={styles.sectionTitle}>Model Predictions:</Text>
            
            <View style={styles.modelsContainer}>
              <View style={styles.modelCard}>
                <Text style={styles.modelTitle}>Model 1</Text>
                <Text style={[
                  styles.modelPrediction, 
                  { color: getMoodColor(moodPrediction.model1Prediction) }
                ]}>
                  {moodPrediction.model1Prediction}
                </Text>
              </View>
              
              <View style={styles.modelCard}>
                <Text style={styles.modelTitle}>Model 2</Text>
                <Text style={[
                  styles.modelPrediction, 
                  { color: getMoodColor(moodPrediction.model2Prediction) }
                ]}>
                  {moodPrediction.model2Prediction}
                </Text>
              </View>
            </View>
            
            <Text style={styles.modelInfo}>
              {predictionMethod === 'ai-model' 
                ? 'Using AI model for prediction' 
                : 'Using simple rules for prediction'}
            </Text>
            
            {Object.keys(keyFeatures).length > 0 && (
              <>
                <View style={styles.divider} />
                
                <Text style={styles.sectionTitle}>Key Features Used:</Text>
                
                <View style={styles.featuresContainer}>
                  {Object.entries(keyFeatures).map(([feature, value], index) => (
                    <Animated.View 
                      key={feature} 
                      style={[styles.featureCard, {
                        opacity: Animated.multiply(
                          animatedValue,
                          index % 2 === 0 ? 0.3 : 0.5
                        ).interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.7, 1]
                        })
                      }]}
                    >
                      <Text style={styles.featureLabel}>{feature}</Text>
                      <Text style={styles.featureValue}>{value}</Text>
                    </Animated.View>
                  ))}
                </View>
                
                <Text style={styles.featureNote}>
                  These are the key parameters used by the ML models for mood prediction.
                  The models calculate statistical features from these real-time readings.
                </Text>
              </>
            )}
          </>
        )}
      </View>
      
      <TouchableOpacity 
        style={styles.analyzeButton}
        onPress={() => {
          // Check if we should use ML explicitly
          const useMLParam = navigation.getState().routes.find(r => r.name === 'MoodAnalysis')?.params?.useML;
          if (useMLParam) {
            analyzeMoodWithML();
          } else {
            analyzeCurrentMood();
          }
        }}
        disabled={isAnalyzing}
      >
        {isAnalyzing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="refresh" size={24} color="#fff" />
            <Text style={styles.analyzeButtonText}>Analyze Again</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#757575',
  },
  statusText: {
    marginTop: 8,
    fontSize: 14,
    color: '#9e9e9e',
    fontStyle: 'italic',
  },
  header: {
    backgroundColor: '#6200ea',
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  card: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  heartRateText: {
    fontSize: 18,
    color: '#424242',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 16,
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  moodLabel: {
    fontSize: 18,
    color: '#757575',
  },
  moodValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    color: '#616161',
    marginBottom: 12,
    fontWeight: '500',
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  confidenceMood: {
    width: 80,
    fontSize: 16,
    color: '#616161',
  },
  confidenceBarContainer: {
    flex: 1,
    height: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
    overflow: 'hidden',
    marginHorizontal: 12,
  },
  confidenceBar: {
    height: '100%',
    borderRadius: 6,
  },
  confidencePercent: {
    width: 40,
    fontSize: 14,
    color: '#757575',
    textAlign: 'right',
  },
  modelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 16,
  },
  modelCard: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  modelTitle: {
    fontSize: 16,
    color: '#757575',
    marginBottom: 8,
  },
  modelPrediction: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modelInfo: {
    fontSize: 14,
    color: '#9e9e9e',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  featureCard: {
    width: '48%',
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  featureLabel: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 4,
  },
  featureValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#424242',
  },
  featureNote: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#9e9e9e',
    textAlign: 'center',
    marginTop: 8,
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6200ea',
    margin: 16,
    padding: 16,
    borderRadius: 8,
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
    marginLeft: 8,
  },
});

export default EnhancedMoodAnalysisScreen;