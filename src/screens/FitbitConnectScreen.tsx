import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  Switch,
  RefreshControl,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import HeartRateService, { HeartRateReading } from '../services/HeartRateService';
import { useFocusEffect } from '@react-navigation/native';

// Define the types for our navigation props
type RootStackParamList = {
  Home: undefined;
  MoodPlayer: { mood?: string; songId?: string };
  Playlist: { playlistId?: string; songs?: any[]; title?: string };
  Settings: undefined;
  FitbitConnect: undefined;
};

type FitbitConnectScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'FitbitConnect'
>;

type Props = {
  navigation: FitbitConnectScreenNavigationProp;
};

// Define interfaces for our device data
interface FitbitDevice {
  id: string;
  name: string;
  batteryLevel?: number;
  model?: string; // Add model field to store device type
}

const FitbitConnectScreen: React.FC<Props> = ({ navigation }) => {
  // Function to safely navigate back to Home without showing back button
  const resetToHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  };
  // Store navigation in global reference for use in deep linking
  useEffect(() => {
    // Make navigation available globally for deep link handling
    global.navigation = navigation;
    
    return () => {
      // Clean up global reference when component unmounts
      global.navigation = undefined;
    };
  }, [navigation]);
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [availableDevices, setAvailableDevices] = useState<FitbitDevice[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<FitbitDevice | null>(null);
  const [heartRate, setHeartRate] = useState<number | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<{name: string, batteryLevel: number} | null>(null);
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false);
  const [heartRateHistory, setHeartRateHistory] = useState<HeartRateReading[]>([]);

  // Effect to prepare WebBrowser and check connection on mount
  useEffect(() => {
    // Prepare WebBrowser for OAuth flow
    WebBrowser.warmUpAsync();
    
    // Check connection status on mount
    checkConnection();
    
    return () => {
      WebBrowser.coolDownAsync();
      
      // Stop monitoring when component unmounts
      if (isMonitoring) {
        stopHeartRateMonitoring();
      }
    };
  }, []);
  
  // Effect to refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refreshData();
      
      return () => {
        // No cleanup needed here
      };
    }, [])
  );
  
  // Effect to update isMonitoring state when monitoring status changes
  useEffect(() => {
    const monitoringStatus = HeartRateService.isMonitoringActive();
    if (monitoringStatus !== isMonitoring) {
      setIsMonitoring(monitoringStatus);
    }
  }, [heartRate]);
  
  const refreshData = async () => {
    if (isLoading || isRefreshing) return;
    
    setIsRefreshing(true);
    
    try {
      const isConnected = await HeartRateService.isConnected();
      
      if (isConnected) {
        // Update connection info
        const device = await HeartRateService.getConnectedDevice();
        setConnectedDevice(device);
        
        // Update heart rate
        const rate = await HeartRateService.getLatestHeartRate();
        setHeartRate(rate);
        
        // Update device info
        const info = await HeartRateService.getDeviceInfo();
        setDeviceInfo(info);
        
        // Get heart rate history
        const history = await HeartRateService.getHeartRateHistory(20);
        setHeartRateHistory(history);
        
        // Check monitoring status
        const monitoringStatus = HeartRateService.isMonitoringActive();
        setIsMonitoring(monitoringStatus);
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
    
    setIsRefreshing(false);
  };

  const checkConnection = async () => {
    setIsLoading(true);
    
    try {
      const isConnected = await HeartRateService.isConnected();
      
      if (isConnected) {
        const device = await HeartRateService.getConnectedDevice();
        setConnectedDevice(device);
        
        // Get current heart rate
        const rate = await HeartRateService.getLatestHeartRate();
        setHeartRate(rate);
        
        // Get device info
        const info = await HeartRateService.getDeviceInfo();
        setDeviceInfo(info);
        
        // Get heart rate history
        const history = await HeartRateService.getHeartRateHistory(20);
        setHeartRateHistory(history);
        
        // Check monitoring status
        const monitoringStatus = HeartRateService.isMonitoringActive();
        setIsMonitoring(monitoringStatus);
      } else {
        setConnectedDevice(null);
        setHeartRate(null);
        setDeviceInfo(null);
        setHeartRateHistory([]);
        setIsMonitoring(false);
      }
    } catch (error) {
      console.error('Error checking connection:', error);
    }
    
    setIsLoading(false);
  };

  const startScan = async () => {
    setIsScanning(true);
    setAvailableDevices([]);
    
    try {
      const devices = await HeartRateService.scanForDevices();
      setAvailableDevices(devices);
    } catch (error) {
      console.error('Error scanning for devices:', error);
      Alert.alert(
        'Scanning Failed',
        'There was a problem finding Fitbit devices. Please try again.',
        [{ text: 'OK' }]
      );
    }
    
    setIsScanning(false);
  };

  const connectToDevice = async (device: FitbitDevice) => {
    setIsLoading(true);
    
    try {
      await HeartRateService.connectToDevice(device.id);
      setConnectedDevice(device);
      
      // Get initial heart rate
      const rate = await HeartRateService.getLatestHeartRate();
      setHeartRate(rate);
      
      // Get device info
      const info = await HeartRateService.getDeviceInfo();
      setDeviceInfo(info);
      
      Alert.alert(
        'Connection Successful',
        `Connected to ${device.name}`,
        [{ 
          text: 'OK',
          onPress: () => resetToHome()
        }]
      );
    } catch (error) {
      console.error('Error connecting to device:', error);
      Alert.alert(
        'Connection Failed',
        'Could not connect to the Fitbit account. Please try again.',
        [{ text: 'OK' }]
      );
    }
    
    setIsLoading(false);
  };

  const disconnectDevice = async () => {
    setIsLoading(true);
    
    try {
      await HeartRateService.disconnectDevice();
      setConnectedDevice(null);
      setHeartRate(null);
      setDeviceInfo(null);
      setHeartRateHistory([]);
      setIsMonitoring(false);
      
      Alert.alert(
        'Device Disconnected',
        'Your Fitbit has been disconnected',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error disconnecting device:', error);
      Alert.alert(
        'Disconnection Failed',
        'Could not disconnect from your Fitbit account. Please try again.',
        [{ text: 'OK' }]
      );
    }
    
    setIsLoading(false);
  };
  
  const toggleHeartRateMonitoring = async () => {
    if (isMonitoring) {
      stopHeartRateMonitoring();
    } else {
      startHeartRateMonitoring();
    }
  };
  
  const startHeartRateMonitoring = async () => {
    try {
      const started = HeartRateService.startMonitoring(60000); // Monitor every minute
      if (started) {
        setIsMonitoring(true);
        Alert.alert(
          'Monitoring Started',
          'Heart rate monitoring has been started. Your heart rate will be updated every minute.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error starting heart rate monitoring:', error);
      Alert.alert(
        'Error',
        'Failed to start heart rate monitoring. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };
  
  const stopHeartRateMonitoring = async () => {
    try {
      const stopped = HeartRateService.stopMonitoring();
      if (stopped) {
        setIsMonitoring(false);
        Alert.alert(
          'Monitoring Stopped',
          'Heart rate monitoring has been stopped.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error stopping heart rate monitoring:', error);
      Alert.alert(
        'Error',
        'Failed to stop heart rate monitoring. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };
  
  const startFitbitAuth = async () => {
    setIsLoading(true);
    
    try {
      console.log('Starting Fitbit auth');
      
      // Create an alert to guide the user
      Alert.alert(
      'Fitbit Authorization',
      'You will be redirected to the Fitbit website. After signing in, the app should automatically reconnect. If not, you can still use the manual token option.',
      [
          { 
            text: 'Continue', 
            onPress: async () => {
              // Set a longer timeout for the loading state
              setTimeout(() => {
                setIsLoading(false);
              }, 30000); // 30 seconds timeout
              
              try {
                // Use the OAuth flow
                const success = await HeartRateService.authorize();
                
                if (success) {
                  // If successful, update the UI
                  await checkConnection();
                  
                  Alert.alert(
                    'Connection Successful',
                    'Connected to Fitbit account',
                    [{ 
                      text: 'OK',
                      onPress: () => resetToHome()
                    }]
                  );
                } else {
                  Alert.alert(
                    'Connection Failed',
                    'Could not connect to your Fitbit account. Try entering your token manually.',
                    [{ 
                      text: 'Enter Token Manually',
                      onPress: () => navigation.navigate('ManualToken')
                    },
                    {
                      text: 'Cancel',
                      style: 'cancel'
                    }]
                  );
                }
                
                setIsLoading(false);
              } catch (error) {
                console.error('Error during Fitbit authorization:', error);
                setIsLoading(false);
                
                Alert.alert(
                  'Connection Failed',
                  'There was an error connecting to your Fitbit account. Would you like to try entering your token manually?',
                  [{ 
                    text: 'Enter Token Manually',
                    onPress: () => navigation.navigate('ManualToken')
                  },
                  {
                    text: 'Cancel',
                    style: 'cancel'
                  }]
                );
              }
            }
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => setIsLoading(false)
          }
        ]
      );
    } catch (error) {
      console.error('Error starting Fitbit authorization:', error);
      setIsLoading(false);
      
      Alert.alert(
        'Connection Error',
        'Could not start the authorization process. Please try manually entering your token.',
        [{ 
          text: 'Enter Token Manually',
          onPress: () => navigation.navigate('ManualToken')
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }]
      );
    }
  };
  
  const openFitbitWebsite = () => {
    Linking.openURL('https://www.fitbit.com/');
  };
  
  const refreshHeartRate = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    
    try {
      // Get updated heart rate
      const rate = await HeartRateService.getLatestHeartRate();
      setHeartRate(rate);
      
      // Get heart rate history
      const history = await HeartRateService.getHeartRateHistory(20);
      setHeartRateHistory(history);
    } catch (error) {
      console.error('Error refreshing heart rate:', error);
    }
    
    setIsRefreshing(false);
  };
  
  const formatTime = (item: HeartRateReading): string => {
    // Use device timestamp if available, otherwise fall back to the local timestamp
    const timestamp = item.deviceTimestamp || item.timestamp;
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const renderDeviceItem = (device: FitbitDevice) => (
    <TouchableOpacity 
      key={device.id}
      style={styles.deviceItem}
      onPress={() => connectToDevice(device)}
      disabled={isLoading}
    >
      <View style={styles.deviceInfo}>
        <Ionicons name="watch-outline" size={24} color="#6200ea" />
        <View style={styles.deviceText}>
          <Text style={styles.deviceName}>{device.name || 'Unknown Device'}</Text>
          {device.batteryLevel !== undefined && (
            <Text style={styles.deviceId}>Battery: {device.batteryLevel}%</Text>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={24} color="#bdbdbd" />
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ea" />
        <Text style={styles.loadingText}>
          {connectedDevice ? 'Managing connection...' : 'Checking connection status...'}
        </Text>
      </View>
    );
  }

  const isConnected = connectedDevice !== null;

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl 
          refreshing={isRefreshing} 
          onRefresh={refreshData}
          colors={['#6200ea']}
        />
      }
    >
      <View style={styles.headerContainer}>
        <View style={styles.logoContainer}>
          <Ionicons name="fitness" size={40} color="#6200ea" />
          <Text style={styles.logoText}>Fitbit Connection</Text>
        </View>
        <Text style={styles.subtitle}>
          Connect your Fitbit to get personalized music recommendations based on your heart rate
        </Text>
      </View>
      
      {isConnected ? (
        <View style={styles.connectedContainer}>
          <View style={styles.deviceCard}>
            <View style={styles.deviceCardHeader}>
              <Ionicons name="watch" size={28} color="#6200ea" />
              <View style={styles.deviceCardInfo}>
                <Text style={styles.connectedDeviceName}>{connectedDevice.name}</Text>
                {connectedDevice.model && (
                  <Text style={styles.deviceModel}>{connectedDevice.model}</Text>
                )}
                <Text style={styles.connectedStatus}>Connected via Fitbit API</Text>
                {deviceInfo && (
                  <Text style={styles.batteryStatus}>
                    Battery: {deviceInfo.batteryLevel}%
                  </Text>
                )}
              </View>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.heartRateContainer}>
              <Ionicons name="heart" size={24} color="#e53935" />
              <Text style={styles.heartRateText}>
                {heartRate ? `${heartRate} BPM` : 'Fetching heart rate...'}
              </Text>
            </View>
            
            <View style={styles.monitoringContainer}>
              <Text style={styles.monitoringText}>
                Continuous Heart Rate Monitoring:
              </Text>
              <Switch
                value={isMonitoring}
                onValueChange={toggleHeartRateMonitoring}
                trackColor={{ false: '#d1d1d1', true: '#9c4dcc' }}
                thumbColor={isMonitoring ? '#6200ea' : '#f4f3f4'}
              />
            </View>
            
            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={refreshHeartRate}
              disabled={isRefreshing}
            >
              <Ionicons name="refresh" size={20} color="#fff" />
              <Text style={styles.refreshButtonText}>Refresh Heart Rate</Text>
            </TouchableOpacity>
            
            {heartRateHistory.length > 0 && (
              <View style={styles.historyContainer}>
                <Text style={styles.historyTitle}>Heart Rate History</Text>
                {heartRateHistory.map((item, index) => (
                  <View key={index} style={styles.historyItem}>
                    <Text style={styles.historyValue}>{item.value} BPM</Text>
                    <Text style={styles.historyTime}>{formatTime(item)}</Text>
                  </View>
                ))}
              </View>
            )}
            
            <TouchableOpacity 
              style={styles.disconnectButton}
              onPress={disconnectDevice}
            >
              <Text style={styles.disconnectText}>Disconnect Device</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={styles.returnButton}
            onPress={resetToHome}
          >
            <Text style={styles.returnText}>Return to Home</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.scanContainer}>
          <Text style={styles.scanTitle}>
            {isScanning ? 'Scanning for devices...' : 'Available Devices'}
          </Text>
          
          {isScanning ? (
            <ActivityIndicator style={styles.scanningIndicator} size="large" color="#6200ea" />
          ) : (
            <>
              {availableDevices.length > 0 ? (
                <View style={styles.devicesList}>
                  {availableDevices.map(renderDeviceItem)}
                </View>
              ) : (
                <View style={styles.noDevicesContainer}>
                  <Ionicons name="watch-outline" size={64} color="#e0e0e0" />
                  <Text style={styles.noDevicesText}>No devices found</Text>
                </View>
              )}
              
              <TouchableOpacity 
                style={styles.scanButton}
                onPress={startScan}
              >
                <Ionicons name="search" size={20} color="#fff" />
                <Text style={styles.scanButtonText}>
                  {availableDevices.length > 0 ? 'Scan Again' : 'Scan for Devices'}
                </Text>
              </TouchableOpacity>
              
              <View style={styles.apiConnectContainer}>
                <Ionicons name="cloud-outline" size={40} color="#6200ea" />
                <Text style={styles.apiConnectText}>
                  Connect to your Fitbit account to access heart rate data
                </Text>
                
                <TouchableOpacity 
                  style={styles.apiConnectButton}
                  onPress={startFitbitAuth}
                >
                  <Ionicons name="fitness" size={20} color="#fff" />
                  <Text style={styles.apiConnectButtonText}>
                    Sign in with Fitbit
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                style={styles.fitbitWebsiteButton}
                onPress={openFitbitWebsite}
                >
                <Text style={styles.fitbitWebsiteText}>
                Don't have a Fitbit account? Sign up
                </Text>
                </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.fitbitWebsiteButton, { marginTop: 10 }]}
            onPress={() => {
              // If you need to add a manual token entry option
              // Navigate to the manual token entry screen
              navigation.navigate('ManualToken');
            }}
          >
            <Text style={[styles.fitbitWebsiteText, { color: '#e57373' }]}>
              Having trouble connecting? Tap here
            </Text>
          </TouchableOpacity>
              </View>
            </>
          )}
          
          <View style={styles.helpContainer}>
            <Text style={styles.helpTitle}>How to connect:</Text>
            <View style={styles.helpStep}>
              <Text style={styles.helpStepNumber}>1</Text>
              <Text style={styles.helpStepText}>Tap "Sign in with Fitbit" to authorize your Fitbit account</Text>
            </View>
            <View style={styles.helpStep}>
              <Text style={styles.helpStepNumber}>2</Text>
              <Text style={styles.helpStepText}>Sign in to your Fitbit account when prompted</Text>
            </View>
            <View style={styles.helpStep}>
              <Text style={styles.helpStepNumber}>3</Text>
              <Text style={styles.helpStepText}>Allow MoodBeats to access your Fitbit heart rate data</Text>
            </View>
          </View>
        </View>
      )}
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
    marginTop: 10,
    color: '#757575',
    fontSize: 16,
  },
  headerContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#212121',
    marginLeft: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
  },
  scanContainer: {
    padding: 20,
  },
  scanTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 16,
  },
  scanningIndicator: {
    marginVertical: 32,
  },
  devicesList: {
    marginBottom: 20,
  },
  deviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  deviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceText: {
    marginLeft: 12,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#212121',
  },
  deviceId: {
    fontSize: 12,
    color: '#9e9e9e',
    marginTop: 2,
  },
  noDevicesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 20,
  },
  noDevicesText: {
    fontSize: 16,
    color: '#757575',
    marginTop: 12,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6200ea',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  apiConnectContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 20,
  },
  apiConnectText: {
    fontSize: 16,
    color: '#424242',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  apiConnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6200ea',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 16,
    width: '100%',
  },
  apiConnectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  fitbitWebsiteButton: {
    paddingVertical: 8,
  },
  fitbitWebsiteText: {
    color: '#6200ea',
    fontSize: 14,
  },
  helpContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 12,
  },
  helpStep: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  helpStepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6200ea',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 12,
  },
  helpStepText: {
    flex: 1,
    fontSize: 14,
    color: '#424242',
  },
  connectedContainer: {
    padding: 20,
  },
  deviceCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
  },
  deviceCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  deviceCardInfo: {
    marginLeft: 16,
  },
  connectedDeviceName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
  },
  deviceModel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6200ea',
    marginTop: 2,
  },
  connectedStatus: {
    fontSize: 14,
    color: '#4caf50',
    marginTop: 2,
  },
  batteryStatus: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 16,
  },
  heartRateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  heartRateText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#212121',
    marginLeft: 8,
  },
  monitoringContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  monitoringText: {
    fontSize: 16,
    color: '#424242',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6200ea',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  historyContainer: {
    marginBottom: 20,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 12,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  historyValue: {
    fontSize: 16,
    color: '#6200ea',
  },
  historyTime: {
    fontSize: 14,
    color: '#9e9e9e',
  },
  disconnectButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 24,
    paddingVertical: 12,
    alignItems: 'center',
  },
  disconnectText: {
    color: '#e53935',
    fontSize: 16,
    fontWeight: '500',
  },
  returnButton: {
    backgroundColor: '#6200ea',
    borderRadius: 24,
    paddingVertical: 12,
    alignItems: 'center',
  },
  returnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default FitbitConnectScreen;