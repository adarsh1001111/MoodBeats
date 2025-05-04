import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Linking,
  Platform,
  Clipboard,
  KeyboardAvoidingView,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import HeartRateService from '../services/HeartRateService';
import * as WebBrowser from 'expo-web-browser';

// Define the types for our navigation props
type RootStackParamList = {
  Home: undefined;
  MoodPlayer: { mood?: string; songId?: string };
  Playlist: { playlistId?: string; songs?: any[]; title?: string };
  Settings: undefined;
  FitbitConnect: undefined;
  ManualToken: undefined;
};

type ManualTokenScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'ManualToken'
>;

type Props = {
  navigation: ManualTokenScreenNavigationProp;
};

/**
 * Manual Token Entry Screen
 * Provides a way for users to manually enter Fitbit access tokens
 * when the automatic OAuth flow fails
 */
const ManualTokenScreen: React.FC<Props> = ({ navigation }) => {
  const [accessToken, setAccessToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1: Method selection, 2: Token entry
  const [progress, setProgress] = useState(0);
  const [hasCopiedToken, setHasCopiedToken] = useState(false);
  
  const inputRef = useRef<TextInput>(null);
  
  // Progress timer for loading animation
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    
    if (isLoading && progress < 100) {
      timer = setInterval(() => {
        setProgress(prev => Math.min(prev + 1, 100));
      }, 50);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isLoading, progress]);
  
  // Check if clipboard has a token
  useEffect(() => {
    const checkClipboard = async () => {
      try {
        const clipboardContent = await Clipboard.getString();
        if (clipboardContent && clipboardContent.length > 20) {
          // Likely has a token
          setHasCopiedToken(true);
        }
      } catch (error) {
        console.log('Error checking clipboard:', error);
      }
    };
    
    checkClipboard();
  }, []);
  
  /**
   * Process the manually entered token
   */
  const handleConnect = async () => {
    if (!accessToken.trim()) {
      setError('Please enter an access token');
      return;
    }

    setIsLoading(true);
    setError('');
    setProgress(0);

    try {
      // Use the service method to handle the token
      const success = await HeartRateService.handleManualToken(accessToken);
      
      if (success) {
        Alert.alert(
          'Connection Successful',
          'Successfully connected to Fitbit with manual token',
          [{ 
            text: 'Great!',
            onPress: () => navigation.navigate('Home')
          }]
        );
      } else {
        setError('Failed to authenticate with the provided token. Please check and try again.');
      }
    } catch (error) {
      console.error('Error connecting with manual token:', error);
      setError('An error occurred. Please check the token and try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Open Fitbit authorization page
   */
  const openFitbitAuth = async () => {
    try {
      setIsLoading(true);
      const authUrl = 'https://www.fitbit.com/oauth2/authorize?response_type=token&client_id=23Q9HX&redirect_uri=https://moodbeats.netlify.app/&scope=heartrate%20activity%20profile%20sleep&expires_in=31536000';
      const result = await WebBrowser.openAuthSessionAsync(authUrl, 'moodbeats://');
      
      setIsLoading(false);
      
      if (result.type === 'success') {
        // User completed the flow, show token entry screen
        setStep(2);
        
        // Focus the input
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
          }
        }, 500);
      }
    } catch (error) {
      console.error('Error opening auth URL:', error);
      setIsLoading(false);
      setError('Failed to open Fitbit authorization page');
    }
  };
  
  /**
   * Open the Netlify redirect page directly
   */
  const openRedirectPage = async () => {
    try {
      setIsLoading(true);
      const redirectUrl = 'https://moodbeats.netlify.app/';
      
      // On iOS use SafariViewController, on Android use system browser
      if (Platform.OS === 'ios') {
        await WebBrowser.openBrowserAsync(redirectUrl);
      } else {
        await Linking.openURL(redirectUrl);
      }
      
      setIsLoading(false);
      setStep(2);
      
      // Focus the input
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 500);
    } catch (error) {
      console.error('Error opening redirect page:', error);
      setIsLoading(false);
      setError('Failed to open the redirect page');
    }
  };
  
  /**
   * Get token from clipboard
   */
  const pasteFromClipboard = async () => {
    try {
      const clipboardContent = await Clipboard.getString();
      if (clipboardContent) {
        setAccessToken(clipboardContent);
      }
    } catch (error) {
      console.error('Error pasting from clipboard:', error);
      setError('Failed to paste from clipboard');
    }
  };
  
  /**
   * Clear token input
   */
  const clearToken = () => {
    setAccessToken('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  /**
   * Step 1: Method selection view
   */
  const renderMethodSelection = () => (
    <View style={styles.methodContainer}>
      <Text style={styles.methodTitle}>Choose a Connection Method</Text>
      <Text style={styles.methodSubtitle}>
        If automatic connection failed, you can try these alternative methods
      </Text>
      
      <TouchableOpacity
        style={styles.methodButton}
        onPress={openFitbitAuth}
        disabled={isLoading}
      >
        <Ionicons name="refresh-circle" size={24} color="#6200ea" />
        <View style={styles.methodTextContainer}>
          <Text style={styles.methodButtonText}>Try Authentication Again</Text>
          <Text style={styles.methodDescription}>
            Restart the Fitbit authentication flow
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#bdbdbd" />
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.methodButton}
        onPress={openRedirectPage}
        disabled={isLoading}
      >
        <Ionicons name="globe" size={24} color="#6200ea" />
        <View style={styles.methodTextContainer}>
          <Text style={styles.methodButtonText}>Open Redirect Page</Text>
          <Text style={styles.methodDescription}>
            Get your token from our web redirect page
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#bdbdbd" />
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.methodButton}
        onPress={() => setStep(2)}
        disabled={isLoading}
      >
        <Ionicons name="key" size={24} color="#6200ea" />
        <View style={styles.methodTextContainer}>
          <Text style={styles.methodButtonText}>Enter Token Manually</Text>
          <Text style={styles.methodDescription}>
            Paste a token you've already copied
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#bdbdbd" />
      </TouchableOpacity>
      
      {hasCopiedToken && (
        <TouchableOpacity
          style={[styles.methodButton, { backgroundColor: '#e8f5e9' }]}
          onPress={() => {
            pasteFromClipboard();
            setStep(2);
          }}
          disabled={isLoading}
        >
          <Ionicons name="clipboard" size={24} color="#4caf50" />
          <View style={styles.methodTextContainer}>
            <Text style={[styles.methodButtonText, { color: '#2e7d32' }]}>
              Paste Token from Clipboard
            </Text>
            <Text style={[styles.methodDescription, { color: '#388e3c' }]}>
              A token might already be in your clipboard
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#81c784" />
        </TouchableOpacity>
      )}
      
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#6200ea" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}
    </View>
  );

  /**
   * Step 2: Token entry view
   */
  const renderTokenEntry = () => (
    <KeyboardAvoidingView
      style={styles.tokenEntryContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <Text style={styles.tokenTitle}>Enter Fitbit Access Token</Text>
      <Text style={styles.tokenSubtitle}>
        Paste the access token from Fitbit's authorization page
      </Text>
      
      <View style={styles.inputContainer}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={accessToken}
          onChangeText={setAccessToken}
          placeholder="Paste your Fitbit access token here"
          placeholderTextColor="#9e9e9e"
          multiline
          numberOfLines={4}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isLoading}
        />
        <View style={styles.inputActions}>
          {accessToken ? (
            <TouchableOpacity 
              style={styles.inputButton} 
              onPress={clearToken}
              disabled={isLoading}
            >
              <Ionicons name="close-circle" size={20} color="#9e9e9e" />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity 
            style={styles.inputButton} 
            onPress={pasteFromClipboard}
            disabled={isLoading}
          >
            <Ionicons name="clipboard-outline" size={20} color="#6200ea" />
          </TouchableOpacity>
        </View>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity
        style={[
          styles.connectButton,
          (!accessToken.trim() || isLoading) ? styles.disabledButton : null
        ]}
        onPress={handleConnect}
        disabled={isLoading || !accessToken.trim()}
      >
        {isLoading ? (
          <View style={styles.progressContainer}>
            <Text style={styles.connectButtonText}>Connecting...</Text>
            <View style={styles.progressBarContainer}>
              <View 
                style={[
                  styles.progressBar, 
                  { width: `${progress}%` }
                ]} 
              />
            </View>
          </View>
        ) : (
          <>
            <Ionicons name="fitness" size={20} color="#fff" />
            <Text style={styles.connectButtonText}>Connect to Fitbit</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => setStep(1)}
        disabled={isLoading}
      >
        <Ionicons name="arrow-back" size={18} color="#757575" />
        <Text style={styles.backButtonText}>Back to Methods</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="key" size={48} color="#fff" />
        </View>
        <Text style={styles.title}>Manual Connection</Text>
        <Text style={styles.subtitle}>
          Alternative ways to connect your Fitbit account
        </Text>
      </View>

      {step === 1 ? renderMethodSelection() : renderTokenEntry()}

      <View style={styles.helpContainer}>
        <Text style={styles.helpTitle}>Why am I seeing this screen?</Text>
        <Text style={styles.helpText}>
          Sometimes the automatic Fitbit connection process can be interrupted by
          browser settings, privacy features, or network issues. This screen
          provides alternative methods to connect your Fitbit account.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    alignItems: 'center',
    padding: 24,
    paddingTop: 36,
    backgroundColor: '#6200ea',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 16,
  },
  methodContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  methodTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 8,
  },
  methodSubtitle: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 24,
  },
  methodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  methodTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  methodButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#212121',
  },
  methodDescription: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  loadingText: {
    marginTop: 12,
    color: '#6200ea',
    fontSize: 16,
    fontWeight: '500',
  },
  tokenEntryContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tokenTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 8,
  },
  tokenSubtitle: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 24,
  },
  inputContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    paddingRight: 40,
    fontSize: 16,
    color: '#212121',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  inputActions: {
    position: 'absolute',
    right: 8,
    top: 8,
    flexDirection: 'row',
  },
  inputButton: {
    padding: 4,
    marginLeft: 4,
  },
  errorText: {
    color: '#e53935',
    marginBottom: 16,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6200ea',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  disabledButton: {
    backgroundColor: '#b39ddb',
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  progressContainer: {
    alignItems: 'center',
    width: '100%',
  },
  progressBarContainer: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#fff',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  backButtonText: {
    color: '#757575',
    fontSize: 16,
    marginLeft: 4,
  },
  helpContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 32,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    color: '#424242',
    lineHeight: 20,
  },
});

export default ManualTokenScreen;