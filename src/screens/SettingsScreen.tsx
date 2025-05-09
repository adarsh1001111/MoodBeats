      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mood Prediction</Text>
        
        {renderSettingItem(
          'analytics-outline',
          'Use ML Model',
          'Use advanced ML models for more accurate mood prediction',
          true,
          useMLModel,
          handleToggleMLModel
        )}
        
        {useMLModel && renderActionItem(
          'pulse-outline',
          'Analyze Mood with ML',
          'Run both models to analyze your current mood',
          () => navigation.navigate('MoodAnalysis', { useML: true })
        )}
        
        <View style={styles.settingItem}>
          <View style={styles.settingIconContainer}>
            <Ionicons name="cloud-outline" size={24} color="#6200ea" />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>ML Server Status</Text>
            <Text style={styles.settingDescription}>
              {isCheckingServer
                ? 'Checking server status...'
                : mlServerAvailable
                ? 'Connected and available'
                : 'Not connected or server unavailable'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {isCheckingServer ? (
              <ActivityIndicator size="small" color="#6200ea" />
            ) : (
              <>
                {mlServerAvailable ? (
                  <Ionicons name="checkmark-circle" size={24} color="#4caf50" />
                ) : (
                  <TouchableOpacity onPress={openApiEndpointModal}>
                    <Ionicons name="settings-outline" size={24} color="#6200ea" />
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      </View>  const handleToggleMLModel = async (value: boolean) => {
    setUseMLModel(value);
    
    // Update the EnhancedMoodPredictionService settings
    const newMethod = value ? 'ai-model' : 'local';
    await EnhancedMoodPredictionService.setPredictionMethod(newMethod);
    
    // If we're turning on ML model, check if the server is available
    if (value && !mlServerAvailable) {
      checkMLServerStatus();
    }
    
    saveSettings();
  };
  
  const handleSaveApiEndpoint = async () => {
    try {
      await AsyncStorage.setItem('ml_api_url', apiEndpoint);
      setShowApiModal(false);
      
      // Check if the new endpoint is working
      checkMLServerStatus();
    } catch (error) {
      console.error('Error saving API endpoint:', error);
      Alert.alert('Error', 'Failed to save API endpoint');
    }
  };
  
  const openApiEndpointModal = () => {
    setShowApiModal(true);
  };import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import HeartRateService from '../services/HeartRateService';
import EnhancedMoodPredictionService from '../services/EnhancedMoodPredictionService';

// Define the types for our navigation props
type RootStackParamList = {
  Home: undefined;
  MoodPlayer: { mood?: string; songId?: string };
  Playlist: { playlistId?: string; songs?: any[]; title?: string };
  Settings: undefined;
  FitbitConnect: undefined;
  MLSettings: undefined;
};

type SettingsScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Settings'
>;

type Props = {
  navigation: SettingsScreenNavigationProp;
};

// Define the types for our settings
interface UserSettings {
  autoRefresh: boolean;
  darkMode: boolean;
  dataCollectionEnabled: boolean;
  notificationsEnabled: boolean;
  autoPlayEnabled: boolean;
  highQualityStreaming: boolean;
  showSensorData: boolean;
  useMLModel: boolean;
}

const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fitbitConnected, setFitbitConnected] = useState<boolean>(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [dataCollectionEnabled, setDataCollectionEnabled] = useState<boolean>(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);
  const [autoPlayEnabled, setAutoPlayEnabled] = useState<boolean>(true);
  const [highQualityStreaming, setHighQualityStreaming] = useState<boolean>(false);
  const [showSensorData, setShowSensorData] = useState<boolean>(true);
  const [useMLModel, setUseMLModel] = useState<boolean>(false);
  const [mlServerAvailable, setMlServerAvailable] = useState<boolean>(false);
  const [isCheckingServer, setIsCheckingServer] = useState<boolean>(false);
  const [showApiModal, setShowApiModal] = useState<boolean>(false);
  const [apiEndpoint, setApiEndpoint] = useState<string>('');
  
  useEffect(() => {
    loadSettings();
    checkFitbitConnection();
    loadMLSettings();
    checkMLServerStatus();
  }, []);
  
  const loadSettings = async () => {
    try {
      const settingsJson = await AsyncStorage.getItem('userSettings');
      if (settingsJson) {
        const parsedSettings: UserSettings = JSON.parse(settingsJson);
        setAutoRefresh(parsedSettings.autoRefresh ?? true);
        setDarkMode(parsedSettings.darkMode ?? false);
        setDataCollectionEnabled(parsedSettings.dataCollectionEnabled ?? true);
        setNotificationsEnabled(parsedSettings.notificationsEnabled ?? true);
        setAutoPlayEnabled(parsedSettings.autoPlayEnabled ?? true);
        setHighQualityStreaming(parsedSettings.highQualityStreaming ?? false);
        setShowSensorData(parsedSettings.showSensorData ?? true);
        setUseMLModel(parsedSettings.useMLModel ?? false);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
    
    setIsLoading(false);
  };
  
  const loadMLSettings = async () => {
    try {
      // Get the current prediction method
      const method = await EnhancedMoodPredictionService.getPredictionMethod();
      setUseMLModel(method === 'ai-model');
      
      // Get the API endpoint
      const endpoint = await EnhancedMoodPredictionService.getApiEndpoint();
      setApiEndpoint(endpoint);
    } catch (error) {
      console.error('Error loading ML settings:', error);
    }
  };
  
  const checkMLServerStatus = async () => {
    try {
      setIsCheckingServer(true);
      const isAvailable = await EnhancedMoodPredictionService.isAPIAvailable();
      setMlServerAvailable(isAvailable);
    } catch (error) {
      console.error('Error checking ML server status:', error);
      setMlServerAvailable(false);
    } finally {
      setIsCheckingServer(false);
    }
  };
  
  const saveSettings = async () => {
    try {
      const settings: UserSettings = {
        autoRefresh,
        darkMode,
        dataCollectionEnabled,
        notificationsEnabled,
        autoPlayEnabled,
        highQualityStreaming,
        showSensorData,
        useMLModel,
      };
      
      await AsyncStorage.setItem('userSettings', JSON.stringify(settings));

      // Signal the app to update the sensor display
      if (global.setSensorDisplay) {
        global.setSensorDisplay(showSensorData);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert(
        'Error',
        'Failed to save settings.',
        [{ text: 'OK' }]
      );
    }
  };
  
  const checkFitbitConnection = async () => {
    try {
      const isConnected = await HeartRateService.isConnected();
      setFitbitConnected(isConnected);
    } catch (error) {
      console.error('Error checking Fitbit connection:', error);
    }
  };
  
  const handleToggleAutoRefresh = (value: boolean) => {
    setAutoRefresh(value);
    saveSettings();
  };
  
  const handleToggleDarkMode = (value: boolean) => {
    setDarkMode(value);
    saveSettings();
    // In a complete app, you would implement a theme system here
  };
  
  const handleToggleDataCollection = (value: boolean) => {
    setDataCollectionEnabled(value);
    saveSettings();
  };
  
  const handleToggleNotifications = (value: boolean) => {
    setNotificationsEnabled(value);
    saveSettings();
  };
  
  const handleToggleAutoPlay = (value: boolean) => {
    setAutoPlayEnabled(value);
    saveSettings();
  };
  
  const handleToggleHighQuality = (value: boolean) => {
    setHighQualityStreaming(value);
    saveSettings();
  };
  
  const handleToggleSensorData = (value: boolean) => {
    setShowSensorData(value);
    saveSettings();
  };
  
  const handleToggleMLModel = async (value: boolean) => {
    setUseMLModel(value);
    
    // Update the EnhancedMoodPredictionService settings
    const newMethod = value ? 'ai-model' : 'local';
    await EnhancedMoodPredictionService.setPredictionMethod(newMethod);
    
    // If we're turning on ML model, check if the server is available
    if (value && !mlServerAvailable) {
      checkMLServerStatus();
    }
    
    saveSettings();
  };
  
  const handleSaveApiEndpoint = async () => {
    try {
      await AsyncStorage.setItem('ml_api_url', apiEndpoint);
      setShowApiModal(false);
      
      // Check if the new endpoint is working
      checkMLServerStatus();
    } catch (error) {
      console.error('Error saving API endpoint:', error);
      Alert.alert('Error', 'Failed to save API endpoint');
    }
  };
  
  const openApiEndpointModal = () => {
    setShowApiModal(true);
  };
  
  const handleClearCache = async () => {
    Alert.alert(
      'Clear Cache',
      'This will clear all cached data and may improve app performance. Continue?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear',
          onPress: async () => {
            // In a complete app, you would clear the cache here
            Alert.alert(
              'Cache Cleared',
              'All cached data has been cleared successfully.',
              [{ text: 'OK' }]
            );
          },
        },
      ]
    );
  };
  
  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            // In a complete app, you would implement sign out logic here
            navigation.navigate('Home');
          },
        },
      ]
    );
  };
  
  const renderSettingItem = (
    icon: string, 
    title: string, 
    description: string | null, 
    toggle: boolean, 
    value: boolean, 
    onValueChange: (value: boolean) => void
  ) => (
    <View style={styles.settingItem}>
      <View style={styles.settingIconContainer}>
        <Ionicons name={icon as any} size={24} color="#6200ea" />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {description && <Text style={styles.settingDescription}>{description}</Text>}
      </View>
      {toggle && (
        <Switch
          trackColor={{ false: '#bdbdbd', true: '#b39ddb' }}
          thumbColor={value ? '#6200ea' : '#f5f5f5'}
          ios_backgroundColor="#bdbdbd"
          onValueChange={onValueChange}
          value={value}
        />
      )}
    </View>
  );
  
  const renderActionItem = (
    icon: string, 
    title: string, 
    description: string | null, 
    onPress: () => void
  ) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={styles.settingIconContainer}>
        <Ionicons name={icon as any} size={24} color="#6200ea" />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {description && <Text style={styles.settingDescription}>{description}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={24} color="#bdbdbd" />
    </TouchableOpacity>
  );
  
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Device</Text>
        
        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => navigation.navigate('FitbitConnect')}
        >
          <View style={styles.settingIconContainer}>
            <Ionicons name="watch-outline" size={24} color="#6200ea" />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Fitbit Connection</Text>
            <Text style={styles.settingDescription}>
              {fitbitConnected ? 'Connected' : 'Not connected'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#bdbdbd" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => navigation.navigate('MLSettings')}
        >
          <View style={styles.settingIconContainer}>
            <Ionicons name="analytics-outline" size={24} color="#6200ea" />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>ML Model Settings</Text>
            <Text style={styles.settingDescription}>
              Configure ML models for mood prediction
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#bdbdbd" />
        </TouchableOpacity>
        
        {renderSettingItem(
          'refresh-circle-outline',
          'Auto-refresh Recommendations',
          'Automatically refresh music recommendations based on heart rate changes',
          true,
          autoRefresh,
          handleToggleAutoRefresh
        )}
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Settings</Text>
        
        {renderSettingItem(
          'contrast-outline',
          'Dark Mode',
          'Use dark theme throughout the app',
          true,
          darkMode,
          handleToggleDarkMode
        )}
        
        {renderSettingItem(
          'notifications-outline',
          'Notifications',
          'Receive alerts and recommendations',
          true,
          notificationsEnabled,
          handleToggleNotifications
        )}

        {renderSettingItem(
          'speedometer-outline',
          'Sensor Data Display',
          'Show accelerometer and gyroscope readings',
          true,
          showSensorData,
          handleToggleSensorData
        )}
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Playback</Text>
        
        {renderSettingItem(
          'play-circle-outline',
          'Auto-play',
          'Automatically play music when opening a playlist',
          true,
          autoPlayEnabled,
          handleToggleAutoPlay
        )}
        
        {renderSettingItem(
          'radio-outline',
          'High Quality Streaming',
          'Stream music in higher quality (uses more data)',
          true,
          highQualityStreaming,
          handleToggleHighQuality
        )}
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privacy</Text>
        
        {renderSettingItem(
          'analytics-outline',
          'Data Collection',
          'Allow anonymous data collection to improve recommendations',
          true,
          dataCollectionEnabled,
          handleToggleDataCollection
        )}
        
        {renderActionItem(
          'information-circle-outline',
          'Privacy Policy',
          'View our privacy policy',
          () => {
            // In a complete app, you would navigate to the privacy policy here
            Alert.alert('Privacy Policy', 'Privacy policy would be shown here.');
          }
        )}
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        
        {renderActionItem(
          'person-outline',
          'Account Settings',
          'Manage your account',
          () => {
            // In a complete app, you would navigate to account settings here
            Alert.alert('Account Settings', 'Account settings would be shown here.');
          }
        )}
        
        {renderActionItem(
          'trash-outline',
          'Clear Cache',
          'Free up storage space',
          handleClearCache
        )}
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        
        {renderActionItem(
          'help-circle-outline',
          'Help & Support',
          'Get help with using the app',
          () => {
            // In a complete app, you would navigate to help here
            Alert.alert('Help & Support', 'Help and support information would be shown here.');
          }
        )}
        
        {renderActionItem(
          'star-outline',
          'Rate the App',
          'Share your feedback',
          () => {
            // In a complete app, you would open the app store rating here
            Alert.alert('Rate the App', 'App store rating would be shown here.');
          }
        )}
        
        <View style={styles.settingItem}>
          <View style={styles.settingIconContainer}>
            <Ionicons name="information-circle-outline" size={24} color="#6200ea" />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Version</Text>
            <Text style={styles.settingDescription}>1.0.0</Text>
          </View>
        </View>
      </View>
      
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
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
  signOutButton: {
    margin: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
    paddingVertical: 12,
    alignItems: 'center',
  },
  signOutText: {
    color: '#e53935',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default SettingsScreen;
