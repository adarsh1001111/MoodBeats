/**
 * Fitbit Token Validator
 * 
 * This script validates a Fitbit OAuth token by making a test API call
 * and provides detailed information about the token's validity.
 * Run this to diagnose authorization issues.
 */

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  tokenFile: path.join(__dirname, 'fitbit_test_token.json'),
  fitbitApiBaseUrl: 'https://api.fitbit.com',
  testEndpoint: '/1/user/-/profile.json'
};

/**
 * Read token from file
 */
async function readTokenFile() {
  try {
    if (!fs.existsSync(CONFIG.tokenFile)) {
      console.log(`Token file ${CONFIG.tokenFile} not found. Please create it with your token data.`);
      console.log('Example format:');
      console.log(JSON.stringify({
        accessToken: "YOUR_ACCESS_TOKEN",
        refreshToken: "YOUR_REFRESH_TOKEN",
        expiresAt: 1777731258505, // epoch time in milliseconds
        userId: "OPTIONAL_USER_ID",
        scope: "OPTIONAL_SCOPE_STRING",
        tokenType: "Bearer"
      }, null, 2));
      process.exit(1);
    }

    const tokenJson = fs.readFileSync(CONFIG.tokenFile, 'utf8');
    return JSON.parse(tokenJson);
  } catch (error) {
    console.error('Error reading token file:', error);
    process.exit(1);
  }
}

/**
 * Validate token by making test API request
 */
async function validateToken(token) {
  try {
    console.log('Making test API request to validate token...');
    console.log(`Endpoint: ${CONFIG.fitbitApiBaseUrl}${CONFIG.testEndpoint}`);
    
    // Try various authorization headers if token_type is not specified
    const authHeaders = [
      `${token.tokenType || 'Bearer'} ${token.accessToken}`, 
      `Bearer ${token.accessToken}`
    ];
    
    let success = false;
    let response;
    let result;
    
    // Try each auth header format until one works
    for (const authHeader of authHeaders) {
      console.log(`Trying Authorization header: ${authHeader.substring(0, 10)}...`);
      
      try {
        response = await fetch(`${CONFIG.fitbitApiBaseUrl}${CONFIG.testEndpoint}`, {
          method: 'GET',
          headers: {
            'Authorization': authHeader,
            'Accept': 'application/json'
          }
        });
        
        console.log(`Response status: ${response.status}`);
        
        if (response.ok) {
          success = true;
          result = await response.json();
          console.log('API call successful!');
          break;
        } else {
          const errorText = await response.text();
          console.log(`API Error: ${errorText}`);
        }
      } catch (fetchError) {
        console.error('Fetch error:', fetchError.message);
      }
    }
    
    return { success, response, result };
  } catch (error) {
    console.error('Error validating token:', error);
    return { success: false, error };
  }
}

/**
 * Display token information
 */
function displayTokenInfo(token) {
  console.log('\n===== Token Information =====');
  console.log(`Access Token: ${token.accessToken ? token.accessToken.substring(0, 10) + '...' : 'Not found'}`);
  console.log(`Refresh Token: ${token.refreshToken ? token.refreshToken.substring(0, 10) + '...' : 'Not found'}`);
  
  const now = Date.now();
  const expiryDate = new Date(token.expiresAt);
  const isExpired = token.expiresAt < now;
  const timeToExpiry = Math.floor((token.expiresAt - now) / 1000 / 60); // minutes
  
  console.log(`Expires At: ${expiryDate.toISOString()}`);
  console.log(`Token Status: ${isExpired ? 'EXPIRED' : 'Valid'}`);
  
  if (!isExpired) {
    console.log(`Time to expiry: ${timeToExpiry} minutes`);
  } else {
    console.log(`Expired: ${Math.abs(timeToExpiry)} minutes ago`);
  }
  
  console.log(`Token Type: ${token.tokenType || 'Not specified (defaulting to Bearer)'}`);
  console.log(`User ID: ${token.userId || 'Not specified'}`);
  console.log(`Scopes: ${token.scope || 'Not specified'}`);
  
  // Parse and display scopes if available
  if (token.scope) {
    const scopes = token.scope.split(' ');
    console.log('Granted scopes:');
    scopes.forEach(scope => console.log(`  - ${scope}`));
    
    // Check for missing important scopes
    const requiredScopes = ['activity', 'heartrate', 'profile', 'settings', 'sleep'];
    const missingScopes = requiredScopes.filter(scope => !scopes.includes(scope));
    
    if (missingScopes.length > 0) {
      console.log('\nWARNING: Missing important scopes:');
      missingScopes.forEach(scope => console.log(`  - ${scope}`));
    }
  }
}

/**
 * Display API response information
 */
function displayApiResult(validationResult) {
  console.log('\n===== API Validation Result =====');
  
  if (validationResult.success) {
    console.log('✅ Token is valid and working!');
    console.log('\nUser Profile Information:');
    if (validationResult.result && validationResult.result.user) {
      const user = validationResult.result.user;
      console.log(`Name: ${user.fullName || user.displayName}`);
      console.log(`User ID: ${user.encodedId}`);
      console.log(`Member Since: ${user.memberSince}`);
    }
  } else {
    console.log('❌ Token validation failed');
    console.log('\nPossible reasons:');
    console.log('1. Token is expired');
    console.log('2. Token doesn\'t have required scopes');
    console.log('3. Authorization header format is incorrect');
    console.log('4. Token has been revoked');
    
    console.log('\nSuggested fixes:');
    console.log('- Generate a new token with the correct scopes');
    console.log('- Ensure you\'re using the correct authorization header format');
    console.log('- If using refresh token, try refreshing the access token');
  }
}

/**
 * Main function
 */
async function main() {
  console.log('===== Fitbit Token Validator =====');
  
  // Read token from file
  const token = await readTokenFile();
  
  // Display token information
  displayTokenInfo(token);
  
  // Validate token
  const validationResult = await validateToken(token);
  
  // Display API result
  displayApiResult(validationResult);
}

// Run the main function
main().catch(console.error);
