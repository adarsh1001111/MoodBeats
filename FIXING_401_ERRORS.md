# Fixing Fitbit 401 Unauthorized Errors

If you're experiencing 401 Unauthorized errors when connecting to your Fitbit account, follow this guide to resolve the issue.

## Common Causes of 401 Errors

1. **Missing OAuth Scopes**: Your token doesn't have permission to access certain data types
2. **Token Expiration**: Your access token has expired
3. **Invalid Token**: Your token is invalid or has been revoked
4. **Redirect URI Mismatch**: The configured redirect URI doesn't match what's on the Fitbit Developer Dashboard
5. **Authorization Header Format**: The API request isn't using the correct authorization header format

## Quick Fix Steps

### Step 1: Clear Existing Tokens

First, clear any invalid tokens from the app:

1. Go to Settings > Advanced > Clear Tokens
2. Return to the Fitbit Connect screen

### Step 2: Revoke App Access in Fitbit

1. Go to [Fitbit Application Management](https://www.fitbit.com/settings/applications)
2. Find the MoodBeats application
3. Click "Revoke Access"

### Step 3: Reconnect with All Required Scopes

When reconnecting, make sure you grant all requested permissions. The app needs access to:

- Heart rate data
- Activity data
- Profile information 
- Sleep data
- Other health metrics (weight, nutrition)

### Step 4: Try Manual Authentication

If automatic connection still fails:

1. On the Fitbit Connect screen, tap "Having trouble connecting? Tap here"
2. Follow the instructions for manual token entry
3. If prompted for scopes, ensure you grant all requested permissions

## Advanced Troubleshooting

If you continue to experience 401 errors after trying the quick fix steps:

### Run the Reset Script

We've included a reset script that guides you through the complete reset process:

```bash
node reset_fitbit_auth.js
```

### Check Token Details

You can check your token details with:

```bash
node check_token_status.js
```

This will show:
- If your token is valid
- What scopes it has
- When it expires
- API test results

### Debugging Information

The `authorization_debug.js` script provides:
- A correctly formatted authorization URL
- Information about required scopes
- Redirect URI validation

```bash
node authorization_debug.js
```

## Technical Details

### 401 Error Messages

Common 401 error responses from Fitbit:

- `"Invalid token"`: The access token is malformed or doesn't exist
- `"Expired token"`: The access token has expired
- `"Invalid client"`: Client ID/secret issues
- `"Insufficient scope"`: Token lacks required permissions

### Scope Requirements

The app requires these Fitbit API scopes:
- `activity` - For step count, distance, calories
- `heartrate` - For heart rate data (critical)
- `profile` - For basic user info
- `settings` - For device settings
- `sleep` - For sleep tracking data
- `weight` - For weight logs (helps with heart analysis)

## Contact Support

If none of these solutions work, please contact support with:
- Screenshots of any error messages
- The version of the app you're using
- Your Fitbit device model
- Steps you've already tried
