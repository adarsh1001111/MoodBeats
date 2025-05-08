import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import EnhancedMoodPredictionService, { PredictionMethod } from '../services/EnhancedMoodPredictionService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define the types for our navigation props
type RootStackParamList = {
  Home: undefined;
  Settings: undefined;
  MLSettings: undefined;
};

type MLSettingsScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'MLSettings'
>;

type Props = {
  navigation: MLSettingsScreenNavigationProp;
};

const MLSettingsScreen: React.FC<Props> = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCheckingAPI, setIsCheckingAPI] = useState<boolean>(false);
  const [predictionMethod, setPredictionMethod] = useState<PredictionMethod>('local');
  const [apiEndpoint, setApiEndpoint] = useState<string>('');
  const [apiAvailable, setApiAvailable] = useState<boolean>(false);
  const [editedApiEndpoint, setEditedApiEndpoint] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Get prediction method
      const method = await EnhancedMoodPredictionService.getPredictionMethod();
      setPredictionMethod(method);

      // Get API endpoint
      const endpoint = await EnhancedMoodPredictionService.getApiEndpoint();
      setApiEndpoint(endpoint);
      setEditedApiEndpoint(endpoint);

      // Check if API is available
      const isAvailable = await EnhancedMoodPredictionService.isAPIAvailable();
      setApiAvailable(isAvailable);
    } catch (error) {
      console.error('Error loading ML settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePredictionMethod = async (value: boolean) => {
    const newMethod: PredictionMethod = value ? 'ai-model' : 'local';
    setPredictionMethod(newMethod);
    
    // If switching to AI model, check if API is available
    if (newMethod === 'ai-model' && !apiAvailable) {
      checkApiAvailability();
    }
    
    // Save the setting
    await EnhancedMoodPredictionService.setPredictionMethod(newMethod);
  };

  const saveApiEndpoint = async () => {
    try {
      if (!editedApiEndpoint) {
        Alert.alert('Error', 'API endpoint cannot be empty');
        return;
      }

      // Validate URL format
      if (!editedApiEndpoint.startsWith('http://') && !editedApiEndpoint.startsWith('https://')) {
        Alert.alert('Error', 'API endpoint must start with http:// or https://');
        return;
      }

      // Save the new endpoint
      await AsyncStorage.setItem('ml_api_url', editedApiEndpoint);
      setApiEndpoint(editedApiEndpoint);
      setIsEditing(false);

      // Check if the new endpoint is available
      checkApiAvailability();
    } catch (error) {
      console.error('Error saving API endpoint:', error);
      Alert.alert('Error', 'Failed to save API endpoint');
    }
  };

  const checkApiAvailability = async () => {
    try {
      setIsCheckingAPI(true);
      const isAvailable = await EnhancedMoodPredictionService.isAPIAvailable();
      setApiAvailable(isAvailable);

      if (isAvailable) {
        Alert.alert('Success', 'ML API is available and models are loaded');
      } else {
        Alert.alert('Warning', 'ML API is not available or models are not loaded');
      }
    } catch (error) {
      console.error('Error checking API availability:', error);
      Alert.alert('Error', 'Failed to check API availability');
    } finally {
      setIsCheckingAPI(false);
    }
  };

  const copyFilesToDevice = async () => {
    Alert.alert(
      'Copy Models',
      'This will attempt to copy the ML models and song files to your device. This might take some time and requires storage permissions. Continue?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Copy',
          onPress: async () => {
            try {
              // This would be implemented if we were going to copy the models
              // to the device storage, but for now we'll just use the Flask server
              Alert.alert(
                'Not Implemented',
                'This feature would copy the ML models to the device for offline use. For now, please use the Flask server approach.',
                [{ text: 'OK' }]
              );
            } catch (error) {
              console.error('Error copying files:', error);
              Alert.alert('Error', 'Failed to copy files');
            }
          },
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ea" />
        <Text style={styles.loadingText}>Loading ML settings...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ML Model Settings</Text>

        <View style={styles.settingItem}>
          <View style={styles.settingIconContainer}>
            <Ionicons name="analytics-outline" size={24} color="#6200ea" />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Use ML Model for Mood Prediction</Text>
            <Text style={styles.settingDescription}>
              {predictionMethod === 'ai-model'
                ? 'Using ML model for mood prediction'
                : 'Using simple rules for mood prediction'}
            </Text>
          </View>
          <Switch
            trackColor={{ false: '#bdbdbd', true: '#b39ddb' }}
            thumbColor={predictionMethod === 'ai-model' ? '#6200ea' : '#f5f5f5'}
            ios_backgroundColor="#bdbdbd"
            onValueChange={(value) => handleTogglePredictionMethod(value)}
            value={predictionMethod === 'ai-model'}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingIconContainer}>
            <Ionicons name="cloud-outline" size={24} color="#6200ea" />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>ML API Status</Text>
            <Text style={styles.settingDescription}>
              {isCheckingAPI
                ? 'Checking API status...'
                : apiAvailable
                ? 'API is available and models are loaded'
                : 'API is not available or models are not loaded'}
            </Text>
          </View>
          {isCheckingAPI ? (
            <ActivityIndicator size="small" color="#6200ea" />
          ) : (
            <TouchableOpacity onPress={checkApiAvailability}>
              <Ionicons
                name="refresh-outline"
                size={24}
                color="#6200ea"
              />
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.settingItem, { flexDirection: 'column', alignItems: 'flex-start' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%' }}>
            <View style={styles.settingIconContainer}>
              <Ionicons name="link-outline" size={24} color="#6200ea" />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>ML API Endpoint</Text>
              {!isEditing && (
                <Text style={styles.settingDescription}>{apiEndpoint}</Text>
              )}
            </View>
            {!isEditing ? (
              <TouchableOpacity onPress={() => setIsEditing(true)}>
                <Ionicons name="create-outline" size={24} color="#6200ea" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => setIsEditing(false)}>
                <Ionicons name="close-outline" size={24} color="#e53935" />
              </TouchableOpacity>
            )}
          </View>

          {isEditing && (
            <View style={styles.apiInputContainer}>
              <TextInput
                style={styles.apiInput}
                value={editedApiEndpoint}
                onChangeText={setEditedApiEndpoint}
                placeholder="http://192.168.1.123:5000/api"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.saveButton}
                onPress={saveApiEndpoint}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.helpContainer}>
          <Text style={styles.helpTitle}>How to Use ML Models:</Text>
          <Text style={styles.helpText}>
            1. Start the Flask server on your computer with the command: python flask_server.py
          </Text>
          <Text style={styles.helpText}>
            2. Make sure your phone and computer are on the same WiFi network
          </Text>
          <Text style={styles.helpText}>
            3. Enter your computer's IP address in the API endpoint field (e.g., http://192.168.1.123:5000/api)
          </Text>
          <Text style={styles.helpText}>
            4. Click "Check API" to confirm the server is running and models are loaded
          </Text>
          <Text style={styles.helpText}>
            5. Enable "Use ML Model for Mood Prediction"
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.copyButton}
        onPress={copyFilesToDevice}
      >
        <Ionicons name="download-outline" size={20} color="#fff" />
        <Text style={styles.copyButtonText}>Copy Models to Device (Experimental)</Text>
      </TouchableOpacity>

      {/* Add bottom padding for better scrolling experience */}
      <View style={{ height: 40 }} />
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
  },
  loadingText: {
    marginTop: 10,
    color: '#757575',
    fontSize: 16,
  },
  section: {
    marginVertical: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#757575',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  settingIconContainer: {
    width: 40,
    alignItems: 'center',
  },
  settingContent: {
    flex: 1,
    marginLeft: 12,
  },
  settingTitle: {
    fontSize: 16,
    color: '#212121',
  },
  settingDescription: {
    fontSize: 12,
    color: '#757575',
    marginTop: 4,
  },
  apiInputContainer: {
    flexDirection: 'row',
    marginTop: 12,
    marginLeft: 52,
    marginRight: 16,
    width: '100%',
  },
  apiInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  saveButton: {
    backgroundColor: '#6200ea',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 8,
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  helpContainer: {
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#424242',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 4,
    lineHeight: 18,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6200ea',
    margin: 16,
    padding: 12,
    borderRadius: 4,
  },
  copyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
});

export default MLSettingsScreen;
