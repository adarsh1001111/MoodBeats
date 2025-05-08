# Understanding Fitbit OAuth 2.0 Implementation

This document explains how the Fitbit OAuth 2.0 implementation works in MoodBeats and how to troubleshoot common authentication issues.

## Fitbit OAuth Flow

MoodBeats uses the **Authorization Code Flow with PKCE** (Proof Key for Code Exchange) to securely authenticate with Fitbit. This flow consists of the following steps:

1. **Generate Code Verifier**: A random string that will be used to verify the authorization code
2. **Generate Code Challenge**: A SHA-256 hash of the code verifier (base64url encoded)
3. **Authorization Request**: Redirect user to Fitbit's authorization page with the code challenge
4. **User Authorization**: User approves access to their Fitbit data
5. **Code Exchange**: Exchange the authorization code for an access token using the code verifier
6. **Token Storage**: Store the access token and refresh token securely
7. **API Requests**: Use the access token to make API requests to Fitbit
8. **Token Refresh**: Use the refresh token to get a new access token when needed

## Specific Fitbit OAuth Requirements

Fitbit's OAuth implementation has some specific requirements that must be followed:

### 1. Authorization Header Format

For token exchange requests (getting or refreshing tokens), you must use HTTP Basic Authentication:

```
Authorization: Basic {base64(client_id:client_secret)}
```

For API requests, you must use Bearer authentication:

```
Authorization: Bearer {access_token}
```

### 2. Content Types

For token requests:
- Use `Content-Type: application/x-www-form-urlencoded`
- Form parameters must be URL-encoded

For API requests:
- Use `Accept: application/json` for JSON responses

### 3. Redirect URI

The redirect URI must exactly match what's registered in your Fitbit developer dashboard, including:
- Protocol (http vs https)
- Domain name
- Path
- Presence or absence of trailing slash

### 4. Scopes

Fitbit requires specific scopes for different types of data:
- `activity` - For step count, distance, calories
- `heartrate` - For heart rate data (critical for our app)
- `profile` - For basic user info
- `settings` - For device settings
- `sleep` - For sleep tracking data
- `weight` - For weight logs
- `location` - For GPS/location data
- `nutrition` - For food logging data
- `social` - For friends and social features

## Common 401 Unauthorized Errors

When encountering 401 Unauthorized errors, check for these common issues:

1. **Invalid Authorization Header**: 
   - Check the format of the Authorization header (Basic vs Bearer)
   - Ensure client_id and client_secret are correctly base64 encoded
   - Verify there are no extra spaces or line breaks in the header

2. **Missing or Incorrect Scopes**:
   - Ensure you've requested all necessary scopes during authorization
   - Check if the token's scope includes the resource you're trying to access

3. **Expired Token**:
   - Access tokens typically expire after a few hours
   - Use the refresh token to obtain a new access token

4. **Revoked Permission**:
   - User may have revoked access to your app in their Fitbit settings

5. **Redirect URI Mismatch**:
   - Verify that your redirect URI exactly matches what's in your Fitbit developer dashboard

## Debugging Tools

We've included several tools to help debug OAuth issues:

1. **validate_fitbit_token.js**: Validates a token by making a test API call
2. **reset_fitbit_auth.js**: Resets the authentication state and guides through reconnection
3. **clear_invalid_tokens.js**: Clears stored tokens when they're invalid
4. **authorization_debug.js**: Generates correct authorization URLs with proper scopes

## Troubleshooting Steps

If you're experiencing 401 errors:

1. Check the logs for detailed error messages from Fitbit
2. Verify the Authorization header format in requests
3. Check if the token is expired (expiresAt vs current time)
4. Ensure all necessary scopes are requested
5. Try clearing tokens and re-authorizing
6. Check that redirect URI exactly matches what's in Fitbit developer dashboard

Remember that after changing anything in the Fitbit developer dashboard, you need to re-authorize users to get new tokens with the updated settings.
