/**
 * Emergency token clearing script
 * This script forces removal of invalid tokens
 */

const { AsyncStorage } = require('@react-native-async-storage/async-storage');
const fs = require('fs');
const path = require('path');

// Storage keys
const API_TOKEN_STORAGE_KEY = 'fitbit_api_token';
const DEVICE_STORAGE_KEY = 'connected_fitbit_device';
const CODE_VERIFIER_STORAGE_KEY = 'fitbit_code_verifier';

// Function to simulate AsyncStorage for testing
const clearTokensFromFile = () => {
  // App data locations to check
  const possibleLocations = [
    path.join(__dirname, 'app-storage.json'),
    path.join(__dirname, '.expo', 'storage.json'),
    path.join(__dirname, 'storage.json')
  ];
  
  console.log('Attempting to clear tokens from local storage files...');
  
  for (const location of possibleLocations) {
    try {
      if (fs.existsSync(location)) {
        console.log(`Found storage at ${location}`);
        const data = JSON.parse(fs.readFileSync(location, 'utf8'));
        
        // Remove all Fitbit related keys
        let modified = false;
        [API_TOKEN_STORAGE_KEY, DEVICE_STORAGE_KEY, CODE_VERIFIER_STORAGE_KEY].forEach(key => {
          if (data[key]) {
            delete data[key];
            modified = true;
            console.log(`Deleted ${key} from storage`);
          }
        });
        
        if (modified) {
          fs.writeFileSync(location, JSON.stringify(data, null, 2));
          console.log(`Updated ${location} with tokens removed`);
        }