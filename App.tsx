// Import our ExpoRandom shim first to ensure it is available before any other code runs
import "./src/utils/ExpoRandomShim";

// Import our ExpoRandom shim first to ensure it's available before any other code runs
import './src/utils/ExpoRandomShim';

import React, { useEffect, useState } from 'react';
import { StatusBar, Alert, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SensorDataOverlay from './src/components/SensorDataOverlay';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

// Import screen components
import HomeScreen from './src/screens/HomeScreen';
import EnhancedMoodPlayerScreen from './src/screens/EnhancedMoodPlayerScreen';
import PlaylistScreen from './src/screens/PlaylistScreen';
import SettingsScreen from './src/screens/SettingsScreen.fixed';
import FitbitConnectScreen from './src/screens/FitbitConnectScreen';
import ManualTokenScreen from './src/screens/ManualTokenScreen';
import MoodFolderScreen from './src/screens/MoodFolderScreen';
import AllMoodFoldersScreen from './src/screens/AllMoodFoldersScreen';
import MLSettingsScreen from './src/screens/MLSettingsScreen';
import EnhancedMoodAnalysisScreen from './src/screens/EnhancedMoodAnalysisScreen';

// Import services
import HeartRateService from './src/services/HeartRateService';
import EnhancedMusicService from './src/services/EnhancedMusicService';
import MoodFolderService from './src/services/MoodFolderService';
import AccelerometerService from './src/services/AccelerometerService';
import { MoodType } from './src/services/MoodFolderService';

// Define the stack navigator parameter list
type RootStackParamList = {
  Home: undefined;
  MoodPlayer: { mood?: MoodType; songId?: string };
  Playlist: { playlistId?: string; songs?: any[]; title?: string };
  Settings: undefined;
  FitbitConnect: undefined;
  ManualToken: undefined;
  MoodFolder: { folderId: string };
  AllMoodFolders: undefined;
  MoodAnalysis: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

// Configure linking
const prefix = Linking.createURL('/');
const linking = {
  prefixes: [prefix, 'moodbeats://', 'https://moodbeats.netlify.app'],
  config: {
    screens: {
      Home: 'home',
      MoodPlayer: 'player',
      Playlist: 'playlist',
      Settings: 'settings',
      FitbitConnect: 'fitbit-connect',
      ManualToken: 'manual-token',
      MoodFolder: 'folder',
      AllMoodFolders: 'folders',
    },
    // Add custom path pattern for auth token
    initialRouteName: 'Home',
  },
};

// Add a global reference for navigation and state setters
declare global {
  var navigation: any;
  var setSensorDisplay: ((show: boolean) => void) | undefined;
}

export default function App() {
  // Initialize services on app startup
  useEffect(() => {
    // Tell WebBrowser to handle auth session completion
    WebBrowser.maybeCompleteAuthSession();
    
    // Initialize services
    HeartRateService.initialize();
    const musicService = EnhancedMusicService.getInstance();
    musicService.initialize();
    const folderService = MoodFolderService.getInstance();
    folderService.initialize();
    
    // Initialize accelerometer service
    AccelerometerService.initialize().then(available => {
      if (available) {
        console.log('Accelerometer service initialized successfully');
        AccelerometerService.start();
      } else {
        console.warn('Accelerometer is not available on this device');
      }
    });
    
    // Register a listener for deep links
    const subscription = Linking.addEventListener('url', handleDeepLink);
    
    // Check for initial URL
    Linking.getInitialURL().then(url => {
      if (url) {
        console.log('App opened with URL:', url);
        handleDeepLink({ url });
      } else {
        // Check for token in AsyncStorage as a fallback (especially useful for web redirects)
        checkForStoredToken();
      }
    });
    
    return () => {
      subscription.remove();
      // Clean up music service
      musicService.cleanup();
      // Stop accelerometer service
      AccelerometerService.stop();
    };
  }, []);
  
  // Check for token stored in AsyncStorage (added as a fallback method)
  const checkForStoredToken = async () => {
    try {
      // Check if we already have a Fitbit token stored
      const hasExistingToken = await AsyncStorage.getItem('fitbitAccessToken');
      if (hasExistingToken) {
        console.log('Already have a Fitbit token');
        return; // Don't overwrite existing token
      }
      
      // Try to get token from localStorage if in web environment
      if (typeof window !== 'undefined' && window.localStorage) {
        const token = window.localStorage.getItem('moodbeats_fitbit_token');
        const expiry = window.localStorage.getItem('moodbeats_fitbit_expiry');
        const userId = window.localStorage.getItem('moodbeats_fitbit_userid');
        const timestamp = window.localStorage.getItem('moodbeats_token_timestamp');
        
        if (token && timestamp) {
          const tokenAge = Date.now() - parseInt(timestamp);
          const maxAge = 5 * 60 * 1000; // 5 minutes
          
          if (tokenAge < maxAge) {
            console.log('Found recent token in localStorage, attempting to use it');
            HeartRateService.handleManualToken(token).then(success => {
              if (success) {
                showAuthAlert('Success', 'Fitbit connected successfully via stored token!');
                if (global.navigation) {
                  global.navigation.navigate('Home');
                }
                // Clear the token from localStorage
                window.localStorage.removeItem('moodbeats_fitbit_token');
                window.localStorage.removeItem('moodbeats_fitbit_expiry');
                window.localStorage.removeItem('moodbeats_fitbit_userid');
                window.localStorage.removeItem('moodbeats_token_timestamp');
              }
            });
          } else {
            console.log('Found token in localStorage but it is too old:', tokenAge);
            // Clear old token
            window.localStorage.removeItem('moodbeats_fitbit_token');
          }
        }
      }
    } catch (error) {
      console.error('Error checking for stored token:', error);
    }
  };

  // Function to show alert messages from the auth flow
  const showAuthAlert = (title: string, message: string) => {
    // Wait a bit to make sure the alert shows after the browser closed
    setTimeout(() => {
      Alert.alert(title, message);
    }, 500);
  };

  // Handle deep links
  const handleDeepLink = (event: { url: string }) => {
    console.log('Deep link received in handler:', event.url);
    
    // Check for our custom token URI scheme first (highest priority)
    if (event.url.includes('moodbeats://auth-token/')) {
      console.log('Direct token URI detected - highest priority handling');
      
      try {
        // Extract token directly from the path
        const urlPath = event.url.split('moodbeats://auth-token/')[1];
        const tokenParts = urlPath.split('?');
        const accessToken = tokenParts[0]; // Token is the path portion
        
        // Extract any query parameters
        let expiresIn = '31536000'; // Default to 1 year
        let userId = undefined;
        
        if (tokenParts.length > 1 && tokenParts[1]) {
          const params = new URLSearchParams(tokenParts[1]);
          if (params.has('expires_in')) {
            expiresIn = params.get('expires_in') || expiresIn;
          }
          if (params.has('user_id')) {
            userId = params.get('user_id') || undefined;
          }
        }
        
        console.log('Direct token successfully extracted, processing...');
        
        // Process this token through HeartRateService
        HeartRateService.handleManualToken(accessToken).then(success => {
          if (success) {
            showAuthAlert('Success', 'Fitbit connected successfully via direct token!');
            if (global.navigation) {
              global.navigation.reset({
                index: 0,
                routes: [{ name: 'Home' }],
              });
            }
          } else {
            showAuthAlert('Error', 'Failed to use the direct token. Please try again.');
          }
        });
        
        return; // Stop processing since we've handled the token
      } catch (error) {
        console.error('Error processing direct token URI:', error);
      }
    }
    
    // Check if this is a Fitbit auth callback
    // Look for token in various formats or check if it's from Fitbit
    if (event.url.includes('access_token=') || 
        event.url.includes('moodmusicapp.netlify.app') || 
        event.url.includes('moodbeats.netlify.app') ||
        event.url.includes('fitbit.com')) {
      
      console.log('Processing potential Fitbit auth callback');
      
      try {
        // We'll pass the URL as-is to the HeartRateService 
        console.log('Passing URL to auth handler:', event.url);
        
        // Let HeartRateService handle the callback
        HeartRateService.handleFitbitAuthCallback(event.url).then(success => {
          console.log('Auth callback processing result:', success);
          
          // If successful, show a notification or navigate to a specific screen
          if (success) {
            // Navigate back to home screen as a fresh navigation stack
            // @ts-ignore - We know navigation is available in the context
            // but TypeScript doesn't know that
            if (global.navigation) {
              global.navigation.reset({
                index: 0,
                routes: [{ name: 'Home' }],
              });
            }
            showAuthAlert('Success', 'Fitbit connected successfully!');
            console.log('Authentication successful!');
          } else {
            console.log('Authentication failed or cancelled');
            showAuthAlert('Connection Failed', 'Failed to connect Fitbit. Try connecting manually with your token.');
          }
        }).catch(error => {
          console.error('Error processing auth callback:', error);
          showAuthAlert('Error', 'Error connecting Fitbit. Please try again or connect manually.');
        });
      } catch (error) {
        console.error('Error processing deep link:', error);
        showAuthAlert('Error', 'Error processing authentication. Please try connecting manually.');
      }
    } else {
      // Log all URLs for debugging purposes
      console.log('Received non-auth deep link URL:', event.url);
    }
  };

  // State to control sensor overlay visibility
  const [showSensorData, setShowSensorData] = useState(true);

  // Load sensor display preference from AsyncStorage and make setter globally available
  useEffect(() => {
    // Make the setter available globally for other components to use
    global.setSensorDisplay = setShowSensorData;

    // Load user settings to check if sensor display should be shown
    const loadSensorDisplaySetting = async () => {
      try {
        const settingsJson = await AsyncStorage.getItem('userSettings');
        if (settingsJson) {
          const settings = JSON.parse(settingsJson);
          // If the setting exists, use it; otherwise default to true
          if (settings.showSensorData !== undefined) {
            setShowSensorData(settings.showSensorData);
          }
        }
      } catch (error) {
        console.error('Error loading sensor display settings:', error);
      }
    };

    loadSensorDisplaySetting();

    // Clean up the global reference when component unmounts
    return () => {
      global.setSensorDisplay = undefined;
    };
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer linking={linking}>
        <StatusBar barStyle="light-content" />
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#6200ea',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
            headerBackTitleVisible: false,
          }}>
          <Stack.Screen 
            name="Home" 
            component={HomeScreen} 
            options={({ navigation }) => ({
              title: 'MoodBeats',
              headerLeft: () => null,
              headerShown: true,
              gestureEnabled: false,
              animationEnabled: false
            })}
          />
          <Stack.Screen 
            name="MoodPlayer" 
            component={EnhancedMoodPlayerScreen} 
            options={{ title: 'Now Playing' }}
          />
          <Stack.Screen 
            name="Playlist" 
            component={PlaylistScreen} 
            options={{ title: 'Playlists' }}
          />
          <Stack.Screen 
            name="Settings" 
            component={SettingsScreen} 
            options={{ title: 'Settings' }}
          />
          <Stack.Screen 
            name="FitbitConnect" 
            component={FitbitConnectScreen} 
            options={{ title: 'Connect Fitbit' }}
          />
          <Stack.Screen 
            name="ManualToken" 
            component={ManualTokenScreen} 
            options={{ title: 'Manual Token Entry' }}
          />
          <Stack.Screen 
            name="MoodFolder" 
            component={MoodFolderScreen} 
            options={{ title: 'Mood Folder' }}
          />
          <Stack.Screen 
            name="AllMoodFolders" 
            component={AllMoodFoldersScreen} 
            options={{ title: 'Mood Folders' }}
          />
          <Stack.Screen 
            name="MoodAnalysis" 
            component={EnhancedMoodAnalysisScreen} 
            options={{ title: 'Mood Analysis' }}
          />
        </Stack.Navigator>
        
        {/* Add sensor data overlay */}
        {showSensorData && <SensorDataOverlay position="top-right" updateInterval={200} />}
        
      </NavigationContainer>
    </SafeAreaProvider>
  );
}