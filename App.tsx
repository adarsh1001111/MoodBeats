import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

// Import screen components
import HomeScreen from './src/screens/HomeScreen';
import MoodPlayerScreen from './src/screens/MoodPlayerScreen';
import PlaylistScreen from './src/screens/PlaylistScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import FitbitConnectScreen from './src/screens/FitbitConnectScreen';
import ManualTokenScreen from './src/screens/ManualTokenScreen';

// Import services
import HeartRateService from './src/services/HeartRateService';

// Define the stack navigator parameter list
type RootStackParamList = {
  Home: undefined;
  MoodPlayer: { mood?: string; songId?: string };
  Playlist: { playlistId?: string; songs?: any[]; title?: string };
  Settings: undefined;
  FitbitConnect: undefined;
  ManualToken: undefined;
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
    },
  },
};

export default function App() {
  // Initialize services on app startup
  useEffect(() => {
    // Tell WebBrowser to handle auth session completion
    WebBrowser.maybeCompleteAuthSession();
    
    // Initialize heart rate service
    HeartRateService.initialize();
    
    // Register a listener for deep links
    const subscription = Linking.addEventListener('url', handleDeepLink);
    
    // Check for initial URL
    Linking.getInitialURL().then(url => {
      if (url) {
        console.log('App opened with URL:', url);
        handleDeepLink({ url });
      }
    });
    
    return () => {
      subscription.remove();
    };
  }, []);

  // Handle deep links
  const handleDeepLink = (event: { url: string }) => {
    console.log('Deep link received in handler:', event.url);
    
    // Check if this is a Fitbit auth callback - check for token in various formats
    if (event.url.includes('access_token=')) {
      console.log('Processing Fitbit auth callback');
      
      try {
        // We'll pass the URL as-is to the HeartRateService - the improved service 
        // can handle different URL formats including hash fragments and query params
        console.log('Passing URL to auth handler:', event.url);
        
        // Let HeartRateService handle the callback
        HeartRateService.handleFitbitAuthCallback(event.url).then(success => {
          console.log('Auth callback processing result:', success);
          
          // If successful, show a notification or navigate to a specific screen
          if (success) {
            // You could potentially navigate to a specific screen here
            // navigation.navigate('Home'); 
            console.log('Authentication successful!');
          }
        }).catch(error => {
          console.error('Error processing auth callback:', error);
        });
      } catch (error) {
        console.error('Error processing deep link:', error);
      }
    } else {
      // Log all URLs for debugging purposes
      console.log('Received non-auth deep link URL:', event.url);
    }
  };

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
          }}>
          <Stack.Screen 
            name="Home" 
            component={HomeScreen} 
            options={{ title: 'MoodBeats' }}
          />
          <Stack.Screen 
            name="MoodPlayer" 
            component={MoodPlayerScreen} 
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
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}