/**
 * Fitbit Authorization Debugging Tool
 * 
 * This script helps diagnose and fix Fitbit API authentication issues
 * including 401 Unauthorized errors and scope-related problems.
 */

// Mock implementation for running in Node.js environment
const AsyncStorage = {
  getItem: async (key) => null,
  setItem: async (key, value) => {},
  removeItem: async (key) => {},
};

// Storage keys for Fitbit auth data
const API_TOKEN_STORAGE_KEY = 'fitbit_api_token';
const DEVICE_STORAGE_KEY = 'connected_fitbit_device';
const CODE_VERIFIER_STORAGE_KEY = 'fitbit_code_verifier';

// Fitbit OAuth constants
const CLIENT_ID = '23Q9HX';
const REDIRECT_URI = 'https://moodbeats.netlify.app'; // No trailing slash, matching the dashboard

/**
 * Generate Fitbit authorization URL with correct scopes
 */
const generateAuthUrl = (flowType = 'authorization_code_pkce') => {
  // Set all required scopes
  const scopes = [
    'activity',
    'heartrate',
    'location',
    'nutrition',
    'profile',
    'settings',
    'sleep',
    'social',
    'weight'
  ].join(' ');
  
  const encodedScopes = encodeURIComponent(scopes);
  const state = Math.random().toString(36).substring(2, 15);
  
  if (flowType === 'authorization_code_pkce') {
    console.log(`
===== Authorization Code with PKCE Flow URL =====
To authorize your app with the correct scopes, open this URL in a browser:

https://www.fitbit.com/oauth2/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodedScopes}&state=${state}

After authentication, you'll be redirected to your callback URL with a code parameter.
The app should automatically handle this redirect and exchange the code for a token.
    `);
  } else {
    // Implicit flow as fallback
    console.log(`
===== Implicit Flow URL (Fallback) =====
To use the implicit flow (not recommended), open this URL:

https://www.fitbit.com/oauth2/authorize?response_type=token&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodedScopes}&state=${state}&expires_in=31536000
    `);
  }
};

/**
 * Information about required Fitbit API scopes
 */
const explainScopes = () => {
  console.log(`
===== Required Fitbit API Scopes =====
The following scopes are needed for full app functionality:

- activity: Access to activity data (steps, distance, calories)
- heartrate: Access to heart rate data (required for core app features)
- location: Access to location/GPS data
- nutrition: Access to nutrition and water consumption data
- profile: Access to basic profile information
- settings: Access to user settings
- sleep: Access to sleep tracking data
- social: Access to social aspects (friends, invitations)
- weight: Access to weight logs

If you're experiencing 401 errors on specific endpoints, it's likely because
your token doesn't have the correct scopes. Use the authorization URL above
to generate a new token with all required scopes.
  `);
};

/**
 * Debug information about redirect URI
 */
const debugRedirectUri = () => {
  console.log(`
===== Redirect URI Information =====
Current redirect URI configuration: ${REDIRECT_URI}

✓ This should EXACTLY match what's configured in your Fitbit Developer Dashboard
✓ No trailing slash is used (matching the dashboard)
✓ URL is properly encoded in authorization requests

Common redirect URI issues:
1. Trailing slash discrepancy (e.g., /callback vs /callback/)
2. HTTP vs HTTPS mismatch
3. Typos or capitalization differences
4. Domain mismatch (e.g., netlify.app vs netlifty.app)

Check your Fitbit Developer Dashboard at: https://dev.fitbit.com/apps
  `);
};

// Run all diagnostic functions
console.log('======= FITBIT AUTHORIZATION DEBUGGING TOOL =======');
generateAuthUrl('authorization_code_pkce');
explainScopes();
debugRedirectUri();
console.log('\nUse this information to fix 401 Unauthorized errors with the Fitbit API.');
