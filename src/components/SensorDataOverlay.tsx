import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Accelerometer, Gyroscope } from 'expo-sensors';

interface SensorData {
  x: number;
  y: number;
  z: number;
}

interface SensorDataOverlayProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  updateInterval?: number; // in ms
}

const SensorDataOverlay: React.FC<SensorDataOverlayProps> = ({ 
  position = 'top-right',
  updateInterval = 100 // 10 updates per second by default
}) => {
  const [accelerometerData, setAccelerometerData] = useState<SensorData>({ x: 0, y: 0, z: 0 });
  const [gyroscopeData, setGyroscopeData] = useState<SensorData>({ x: 0, y: 0, z: 0 });
  const [accelerometerAvailable, setAccelerometerAvailable] = useState<boolean>(false);
  const [gyroscopeAvailable, setGyroscopeAvailable] = useState<boolean>(false);

  useEffect(() => {
    let accelerometerSubscription: ReturnType<typeof Accelerometer.addListener>;
    let gyroscopeSubscription: ReturnType<typeof Gyroscope.addListener>;

    const checkSensorsAvailability = async () => {
      const accelerometerAvailable = await Accelerometer.isAvailableAsync();
      const gyroscopeAvailable = await Gyroscope.isAvailableAsync();
      
      setAccelerometerAvailable(accelerometerAvailable);
      setGyroscopeAvailable(gyroscopeAvailable);
      
      if (accelerometerAvailable) {
        Accelerometer.setUpdateInterval(updateInterval);
        accelerometerSubscription = Accelerometer.addListener(data => {
          setAccelerometerData(data);
        });
      }
      
      if (gyroscopeAvailable) {
        Gyroscope.setUpdateInterval(updateInterval);
        gyroscopeSubscription = Gyroscope.addListener(data => {
          setGyroscopeData(data);
        });
      }
    };

    checkSensorsAvailability();

    // Cleanup subscriptions when component unmounts
    return () => {
      if (accelerometerSubscription) accelerometerSubscription.remove();
      if (gyroscopeSubscription) gyroscopeSubscription.remove();
    };
  }, [updateInterval]);

  // Format sensor data to 2 decimal places for display
  const formatData = (value: number) => value.toFixed(2);

  // Determine position styles
  const getPositionStyle = () => {
    switch (position) {
      case 'top-left':
        return { top: 0, left: 0 };
      case 'bottom-right':
        return { bottom: 0, right: 0 };
      case 'bottom-left':
        return { bottom: 0, left: 0 };
      case 'top-right':
      default:
        return { top: 0, right: 0 };
    }
  };

  // Check if we have any sensor data to display
  const hasSensorData = accelerometerAvailable || gyroscopeAvailable;
  
  if (!hasSensorData) {
    return null; // Don't render anything if no sensors are available
  }

  return (
    <View style={[styles.container, getPositionStyle()]}>
      {accelerometerAvailable && (
        <View style={styles.sensorSection}>
          <Text style={styles.sensorTitle}>Accelerometer</Text>
          <Text style={styles.sensorValue}>
            X: {formatData(accelerometerData.x)}
          </Text>
          <Text style={styles.sensorValue}>
            Y: {formatData(accelerometerData.y)}
          </Text>
          <Text style={styles.sensorValue}>
            Z: {formatData(accelerometerData.z)}
          </Text>
        </View>
      )}
      
      {gyroscopeAvailable && (
        <View style={styles.sensorSection}>
          <Text style={styles.sensorTitle}>Gyroscope</Text>
          <Text style={styles.sensorValue}>
            X: {formatData(gyroscopeData.x)}
          </Text>
          <Text style={styles.sensorValue}>
            Y: {formatData(gyroscopeData.y)}
          </Text>
          <Text style={styles.sensorValue}>
            Z: {formatData(gyroscopeData.z)}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 8,
    padding: 8,
    margin: 8,
    maxWidth: 150,
    zIndex: 1000,
  },
  sensorSection: {
    marginBottom: 4,
  },
  sensorTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  sensorValue: {
    fontSize: 9,
    color: '#fff',
  }
});

export default SensorDataOverlay;
