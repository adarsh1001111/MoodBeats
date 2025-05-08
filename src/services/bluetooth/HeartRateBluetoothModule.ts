import BluetoothService from './BluetoothService';
import HeartRateService from '../HeartRateService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';

/**
 * Module to integrate native Bluetooth functionality with HeartRateService
 * This replaces the simulated heart rate data with actual Bluetooth device data
 */
class HeartRateBluetoothModule {
  private static instance: HeartRateBluetoothModule;
  private bluetoothService: BluetoothService;
  private isInitialized: boolean = false;
  
  // Singleton pattern
  private constructor() {
    this.bluetoothService = BluetoothService.getInstance();
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): HeartRateBluetoothModule {
    if (!HeartRateBluetoothModule.instance) {
      HeartRateBluetoothModule.instance = new HeartRateBluetoothModule();
    }
    return HeartRateBluetoothModule.instance;
  }
  
  /**
   * Initialize the module and connect it to the HeartRateService
   */
  public async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }
    
    console.log('Initializing Heart Rate Bluetooth Module');
    
    try {
      // Request Bluetooth permissions
      const permissionsGranted = await this.bluetoothService.requestPermissions();
      if (!permissionsGranted) {
        console.error('Bluetooth permissions not granted');
        return false;
      }
      
      // Initialize Bluetooth service
      const bluetoothInitialized = await this.bluetoothService.initialize();
      if (!bluetoothInitialized) {
        console.error('Failed to initialize Bluetooth service');
        return false;
      }
      
      // Register for heart rate updates
      this.bluetoothService.onHeartRateUpdate(this.handleHeartRateUpdate.bind(this));
      
      // Set flag
      this.isInitialized = true;
      
      // Check if we're already connected to a device
      const connectedDevice = this.bluetoothService.getConnectedDevice();
      if (connectedDevice) {
        console.log('Already connected to device:', connectedDevice.name);
      }
      
      return true;
    } catch (error) {
      console.error('Error initializing Heart Rate Bluetooth Module:', error);
      return false;
    }
  }
  
  /**
   * Handle heart rate updates from Bluetooth service
   */
  private handleHeartRateUpdate(heartRate: number): void {
    console.log('Received heart rate update from Bluetooth:', heartRate);
    
    // Store the heart rate via the HeartRateService
    HeartRateService._storeHeartRate(heartRate, 'bluetooth');
  }
  
  /**
   * Scan for and show a list of heart rate capable devices
   */
  public async scanForDevices(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    console.log('Scanning for heart rate capable devices');
    
    // Start scanning for devices
    await this.bluetoothService.startScan((devices) => {
      console.log(`Found ${devices.length} Bluetooth devices`);
    });
  }
  
  /**
   * Get a list of discovered devices
   */
  public getDiscoveredDevices() {
    return this.bluetoothService.getDiscoveredDevices();
  }
  
  /**
   * Connect to a Bluetooth heart rate device
   */
  public async connectToDevice(deviceId: string): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    console.log('Connecting to heart rate device:', deviceId);
    
    const success = await this.bluetoothService.connectToDevice(deviceId);
    
    if (success) {
      // Stop simulation in HeartRateService if it was running
      HeartRateService.stopSimulation();
      
      // Store the device in HeartRateService format
      const btDevice = this.bluetoothService.getConnectedDevice();
      if (btDevice) {
        const fitbitDevice = {
          id: btDevice.id,
          name: btDevice.name,
          batteryLevel: 100 // Default battery level
        };
        await AsyncStorage.setItem('connected_fitbit_device', JSON.stringify(fitbitDevice));
      }
      
      return true;
    }
    
    return false;
  }
  
  /**
   * Disconnect from the currently connected device
   */
  public async disconnectDevice(): Promise<boolean> {
    if (!this.isInitialized) {
      return false;
    }
    
    console.log('Disconnecting from heart rate device');
    
    const success = await this.bluetoothService.disconnectDevice();
    
    if (success) {
      // Restart simulation in HeartRateService
      HeartRateService.startSimulation();
      return true;
    }
    
    return false;
  }
  
  /**
   * Get the latest heart rate from the Bluetooth device
   */
  public async getLatestHeartRate(): Promise<number | null> {
    if (!this.isInitialized) {
      return null;
    }
    
    return await this.bluetoothService.getLatestHeartRate();
  }
  
  /**
   * Get heart rate history from the Bluetooth device
   */
  public async getHeartRateHistory(limit: number = 20) {
    if (!this.isInitialized) {
      return [];
    }
    
    return await this.bluetoothService.getHeartRateHistory(limit);
  }
  
  /**
   * Check if we're currently connected to a heart rate device
   */
  public isConnectedToDevice(): boolean {
    const device = this.bluetoothService.getConnectedDevice();
    return device !== null && device.connected === true;
  }
  
  /**
   * Get the connected device info
   */
  public getConnectedDevice() {
    return this.bluetoothService.getConnectedDevice();
  }
  
  /**
   * Check if Bluetooth is available on this device
   */
  public async isBluetoothAvailable(): Promise<boolean> {
    return await this.bluetoothService.isBluetoothAvailable();
  }
}

export default HeartRateBluetoothModule;