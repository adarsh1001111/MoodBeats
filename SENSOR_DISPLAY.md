# Sensor Data Display Feature

This document explains the sensor data display feature added to the MoodBeats app, which shows accelerometer and gyroscope readings in real-time.

## Overview

The sensor data display is a small overlay that appears in the top-right corner of the app, showing the current accelerometer and gyroscope readings from the device's sensors. This feature is useful for:

- Visualizing device motion
- Debugging motion-related features
- Understanding how sensor data correlates with mood predictions

## Implementation Details

### Components

1. **SensorDataOverlay**: A React component that displays the sensor data in a small overlay
   - Located in `src/components/SensorDataOverlay.tsx`
   - Uses Expo's sensor API to access device motion data
   - Updates in real-time (configurable update interval)
   - Displays both accelerometer and gyroscope data
   - Can be positioned in different corners of the screen

2. **Settings Integration**:
   - Added toggle in Settings screen to show/hide the overlay
   - Persists user preference using AsyncStorage
   - Global state management through App.tsx

### Technical Details

- **Accelerometer Data**: Measures linear acceleration along X, Y, and Z axes (in G-forces)
- **Gyroscope Data**: Measures rotational velocity around X, Y, and Z axes (in rad/s)
- **Update Interval**: Default is 200ms (5 updates per second) to balance responsiveness and performance
- **Styling**: Semi-transparent black background with white text for visibility across different app screens

## Usage

1. The sensor overlay is enabled by default when the app starts
2. To toggle the display on/off:
   - Go to the Settings screen
   - Find "Sensor Data Display" under App Settings
   - Toggle the switch to show/hide the overlay

3. The setting is persisted across app restarts

## Customization

The overlay can be customized by modifying the SensorDataOverlay component:

- **Position**: Change the `position` prop to one of: 'top-right', 'top-left', 'bottom-right', 'bottom-left'
- **Update Interval**: Change the `updateInterval` prop (in milliseconds)
- **Styling**: Modify the styles in the component to change appearance

Example usage in App.tsx:

```jsx
<SensorDataOverlay position="top-right" updateInterval={200} />
```

## Technical Notes

- The component checks for sensor availability and only displays data for available sensors
- Uses Expo's Accelerometer and Gyroscope APIs from expo-sensors
- Sensor data is formatted to 2 decimal places for readability
- The overlay has a high z-index to ensure it appears above other UI elements

## Limitations

- Not all devices have both accelerometer and gyroscope sensors
- Sensor data may vary in accuracy between different device models
- High update rates may impact battery life
- The overlay may overlap with UI elements on some screens

## Future Enhancements

Possible future improvements:

1. Add visual graph representation of sensor data over time
2. Allow dragging the overlay to reposition it
3. Include more sensors (magnetometer, barometer, etc.)
4. Add calibration options
5. Implement motion gesture recognition based on sensor data
