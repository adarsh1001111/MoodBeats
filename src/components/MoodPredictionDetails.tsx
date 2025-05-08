import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

interface MoodPredictionDetailsProps {
  predictionData: {
    primary_mood: string;
    secondary_mood: string;
    confidence: Record<string, number>;
    model1_prediction?: string;
    model2_prediction?: string;
  } | null;
  isLoading: boolean;
  heartRate: number;
}

const MoodPredictionDetails: React.FC<MoodPredictionDetailsProps> = ({ 
  predictionData, 
  isLoading,
  heartRate
}) => {
  if (isLoading) {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Analyzing Mood</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6200ea" />
          <Text style={styles.loadingText}>Processing biometric data...</Text>
        </View>
      </View>
    );
  }

  if (!predictionData) {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Mood Analysis</Text>
        </View>
        <View style={styles.cardContent}>
          <Text>No prediction data available</Text>
        </View>
      </View>
    );
  }

  const { primary_mood, secondary_mood, confidence, model1_prediction, model2_prediction } = predictionData;
  const sortedMoods = Object.entries(confidence)
    .sort(([, valueA], [, valueB]) => valueB - valueA);

  // Colors for different moods
  const moodColors: Record<string, string> = {
    Happy: '#4CAF50',
    Sad: '#2196F3',
    Angry: '#F44336',
    Relaxed: '#9C27B0',
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Mood Analysis</Text>
        <Text style={styles.cardSubtitle}>{`Heart Rate: ${heartRate} BPM`}</Text>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.primaryMood}>Primary Mood: <Text style={styles.moodValue}>{primary_mood}</Text></Text>
        <Text style={styles.secondaryMood}>Secondary Mood: <Text style={styles.moodValue}>{secondary_mood}</Text></Text>
        
        <View style={styles.separator} />
        
        <Text style={styles.confidenceHeader}>Confidence Scores:</Text>
        {sortedMoods.map(([mood, score]) => (
          <View key={mood} style={styles.confidenceRow}>
            <Text style={styles.moodLabel}>{mood}</Text>
            <View style={styles.progressContainer}>
              <View style={[styles.progressBackground, {width: '100%'}]}>
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
            <Text style={styles.modelHeader}>Model Predictions:</Text>
            <View style={styles.modelContainer}>
              <View style={styles.modelBox}>
                <Text style={styles.modelLabel}>Model 1</Text>
                <Text style={styles.modelPrediction}>{model1_prediction}</Text>
              </View>
              <View style={styles.modelBox}>
                <Text style={styles.modelLabel}>Model 2</Text>
                <Text style={styles.modelPrediction}>{model2_prediction}</Text>
              </View>
            </View>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    elevation: 4,
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
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  primaryMood: {
    fontSize: 18,
    marginBottom: 8,
  },
  secondaryMood: {
    fontSize: 16,
    marginBottom: 12,
  },
  moodValue: {
    fontWeight: 'bold',
  },
  separator: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 12,
  },
  confidenceHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  moodLabel: {
    width: 80,
    fontSize: 14,
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
  },
  modelHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modelBox: {
    backgroundColor: '#F5F5F5',
    padding: 10,
    borderRadius: 4,
    width: '48%',
    alignItems: 'center',
  },
  modelLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  modelPrediction: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default MoodPredictionDetails;