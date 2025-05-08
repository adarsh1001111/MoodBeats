import React, { useState } from 'react'; 
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  ScrollView, 
  ActivityIndicator, 
} from 'react-native'; 
import { StackNavigationProp } from '@react-navigation/stack'; 
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import { validateFitbitToken } from '../utils/FitbitTokenValidator';

type RootStackParamList = {
  Home: undefined;
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

const ManualTokenScreen: React.FC<Props> = ({ navigation }) => {
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTokenSubmit = async () => {
    if (!token.trim()) {
      setError('Please enter a valid token');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Try to extract token from pasted URL or string
      const accessTokenMatch = token.match(/access_token=([^&#]+)/);
      const accessToken = accessTokenMatch ? accessTokenMatch[1] : token.trim();
      
      // Store token
      const tokenData = {
        accessToken: accessToken,
        refreshToken: '', // No refresh token in manual entry
        expiresAt: Date.now() + (31536000 * 1000), // 1 year expiry
        userId: undefined,
        scope: undefined
      };

      await AsyncStorage.setItem('fitbit_api_token', JSON.stringify(tokenData));
      
      // Try to get user profile to validate the token
      const isValid = await validateFitbitToken(accessToken);
      
      if (isValid) {
        Alert.alert(
          'Success',
          'Token successfully added! You have connected to Fitbit.',
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Home' }],
                });
              },
            },
          ]
        );
      } else {
        setError('The token is invalid or has expired. Please try again with a new token.');
        // Clean up the invalid token
        await AsyncStorage.removeItem('fitbit_api_token');
      }
    } catch (err) {
      console.error('Error saving token:', err);
      setError('Failed to save token. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const openFitbitAuth = () => {
    const authUrl = `https://www.fitbit.com/oauth2/authorize?response_type=token&client_id=23Q9HX&redirect_uri=${encodeURIComponent('https://moodbeats.netlify.app/')}&scope=${encodeURIComponent('heartrate activity profile settings sleep')}&expires_in=31536000`;
    
    Alert.alert(
      'Get Fitbit Token',
      'You will be redirected to Fitbit\'s authorization page. After authorizing, copy the access_token from the URL and paste it here.',
      [
        {
          text: 'Copy Auth URL',
          onPress: () => {
            // Copy to clipboard functionality would go here if available
            Alert.alert('Auth URL', authUrl);
          }
        },
        {
          text: 'OK',
          onPress: () => {}
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Manual Fitbit Token Entry</Text>
        
        <Text style={styles.instructions}>
          If automatic connection failed, you can manually enter your Fitbit access token here.
        </Text>
        
        <TouchableOpacity style={styles.helpButton} onPress={openFitbitAuth}>
          <Text style={styles.helpButtonText}>How to Get a Token</Text>
        </TouchableOpacity>
        
        <Text style={styles.label}>Enter Fitbit Access Token:</Text>
        <TextInput
          style={styles.input}
          placeholder="Paste your token or the entire callback URL here"
          value={token}
          onChangeText={setToken}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          autoCapitalize="none"
          autoCorrect={false}
        />
        
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleTokenSubmit}
          disabled={isLoading || !token.trim()}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Connect to Fitbit</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={isLoading}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#6200ea',
    textAlign: 'center',
  },
  instructions: {
    fontSize: 16,
    color: '#424242',
    marginBottom: 20,
    lineHeight: 22,
  },
  helpButton: {
    backgroundColor: '#e1bee7',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  helpButtonText: {
    color: '#4a148c',
    fontSize: 16,
    fontWeight: '500',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#424242',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 120,
    marginBottom: 16,
  },
  errorText: {
    color: '#d32f2f',
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: '#6200ea',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  cancelButton: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#9e9e9e',
  },
  cancelButtonText: {
    color: '#616161',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default ManualTokenScreen;
