#!/bin/bash
echo "Setting up MoodBeats..."

# Install dependencies
echo "Installing dependencies..."
npm install

# Add additional dependencies for testing
echo "Adding Jest for testing..."
npm install --save-dev jest jest-expo @testing-library/react-native @testing-library/jest-native

# Update package.json to include test script
# This uses node to add a test script to package.json
node -e "
const fs = require('fs');
const packageJson = JSON.parse(fs.readFileSync('./package.json'));
packageJson.scripts = packageJson.scripts || {};
packageJson.scripts.test = 'jest';
packageJson.jest = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)'
  ],
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect']
};
fs.writeFileSync('./package.json', JSON.stringify(packageJson, null, 2));
"

echo "Setup complete!"
echo "To start the app, run: npm start"
echo "To run tests, run: npm test"
