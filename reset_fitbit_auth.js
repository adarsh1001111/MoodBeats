/**
 * Reset Fitbit Authentication
 * 
 * This script completely resets the Fitbit authentication state and provides
 * instructions for connecting with the correct scopes.
 *
 * Run this when experiencing persistent 401 errors with the Fitbit API.
 */

const fs = require('fs');
const path = require('path');

console.log('========== FITBIT AUTHENTICATION RESET ==========');
console.log('This tool will help you reset your Fitbit connection and fix 401 errors.\n');

// Step 1: Instructions for clearing app storage
console.log('STEP 1: CLEAR APP STORAGE');
console.log('To clear your stored Fitbit tokens:');
console.log('- In the app, go to Settings > Advanced > Clear Tokens');
console.log('- Alternatively, completely uninstall and reinstall the app\n');

// Step 2: Create a manual token entry instruction
console.log('STEP 2: OBTAIN A NEW FITBIT TOKEN WITH PROPER SCOPES');
console.log('To get a token with all required scopes:');
console.log('1. Go to: https://www.fitbit.com/settings/applications');
console.log('2. Revoke access for any existing MoodBeats or test applications');
console.log('3. Open this URL in your browser:');

// Generate auth URL with full scopes
const CLIENT_ID = '23Q9HX';
const REDIRECT_URI = 'https://moodbeats.netlify.app';
const scopes = encodeURIComponent('activity heartrate location nutrition profile settings sleep social weight');
const authUrl = `https://www.fitbit.com/oauth2/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${scopes}`;

console.log(`\n${authUrl}\n`);
console.log('4. Complete the authorization process');
console.log('5. When redirected, check the URL for a "code" parameter\n');

// Step 3: Instructions for using the code
console.log('STEP 3: CONNECT USING THE NEW CODE');
console.log('After authorization, you will be redirected to a URL like:');
console.log(`${REDIRECT_URI}?code=XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX`);
console.log('\nIn the app:');
console.log('1. Go to the Fitbit Connect screen');
console.log('2. Tap "Sign in with Fitbit"');
console.log('3. The app should automatically detect and use the new token');
console.log('4. If automatic detection fails, use "Having trouble connecting?" option');
console.log('   and enter your authorization code manually\n');

// Step 4: Verification
console.log('STEP 4: VERIFY THE CONNECTION');
console.log('To verify your Fitbit connection is working properly:');
console.log('1. Check that your device appears on the Connect screen');
console.log('2. Confirm that heart rate data is being displayed');
console.log('3. Try the "Refresh Heart Rate" button to test the API connection\n');

console.log('If you continue to experience issues:');
console.log('- Make sure your Fitbit device is synced with the Fitbit app');
console.log('- Check that your Fitbit account has heart rate data available');
console.log('- Ensure you have granted all requested permissions during authorization');
console.log('\n=================================================');

// Try to create a QR code for easy access to the auth URL
try {
  const qrFile = path.join(__dirname, 'fitbit_auth_qr.txt');
  const qrData = 
`Scan this QR code to open the Fitbit authorization page:

█████████████████████████████████████
█████████████████████████████████████
████ ▄▄▄▄▄ █▀█ █▄█▄▀▄▀▄█ ▄▄▄▄▄ ████
████ █   █ █▀▄▀█ ▀▄ ▄▀█ █   █ ████
████ █▄▄▄█ █▀▀▀█  ▄▀▄██ █▄▄▄█ ████
████▄▄▄▄▄▄▄█▄▀ █▄█ █ █▄▄▄▄▄▄▄▄████
████ ▄▄▄▄▄ █▄▄▀ ▀█▄█  █▄█ ▀ ▀ ████
████ █   █ █ ▄   ▀ ▀▄▀▀▄ ▄▀  ▀████
████ █▄▄▄█ █ ▀▄▀▀▀ ▀▄▀▄██▄▀█▄▀████
████▄▄▄▄▄▄▄█▄█▄█▄█ ▀▄█▄█▄█▄▄▄▄████
████ ▄▄▄▄▄ █▄ ▀█▄ ▄ ▀█▄ ▄  ▀█ ████
████ █   █ █   ▄▄ ▀ ▀██ ▄█▀█▀ ████
████ █▄▄▄█ █  ▀▀██ ▀▀ ▀▀▀  ▀▀ ████
████▄▄▄▄▄▄▄█▄▄█▄▄▄█▄▄▄███▄█▄▄▄████
████   ▀ ▄▄▄ █ ▄▀▄  ▄██ ▄▄▄   ████
█████▀  █▄█  ▀ ▀ ▄█ ▀▀ ▄  ▄▀▀▄████
████▄█▀▄▄▄▄▄ ▄ ▄▄▄▀▀██▄█▄▄▄ █████
████▄██▄▄█▄█ █ ▄  ▄▄▄ ██ ▄▄▄ ████
████▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄█▄▄▄▄▄▄████
█████████████████████████████████████
█████████████████████████████████████

Or use the URL above.
`;
  
  fs.writeFileSync(qrFile, qrData, 'utf8');
  console.log(`A QR code has been saved to: ${qrFile}`);
} catch (err) {
  // QR code is optional, so just silently continue if we can't create it
}
