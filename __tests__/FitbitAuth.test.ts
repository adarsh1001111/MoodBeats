import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ExpoLinking from 'expo-linking';
import FitbitAuthService from '../src/services/auth/FitbitAuthService';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('expo-linking', () => ({
  openURL: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

describe('FitbitAuthService', () => {
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
  });

  it('should generate a valid authorization URL', () => {
    const authUrl = FitbitAuthService.getAuthorizationUrl();
    
    // Check that the URL contains required parameters
    expect(authUrl).toContain('https://www.fitbit.com/oauth2/authorize');
    expect(authUrl).toContain('client_id=23Q9HX');
    expect(authUrl).toContain('response_type=token');
    expect(authUrl).toContain('scope=');
    expect(authUrl).toContain('redirect_uri=');
    expect(authUrl).toContain('expires_in=31536000');
  });

  it('should process auth callback with valid token', async () => {
    // Mock implementation for AsyncStorage
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValueOnce(undefined);
    
    // Mock successful fetch for user profile
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce({
        user: {
          encodedId: 'user123',
          firstName: 'Test',
        },
      }),
    });
    
    // Test data
    const callbackUrl = 'https://moodmusicapp.netlify.app/#access_token=abc123&expires_in=86400&user_id=user123';
    
    // Call the method
    const result = await FitbitAuthService.handleAuthorizationCallback(callbackUrl);
    
    // Check result
    expect(result).toBe(true);
    
    // Check that token was stored
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'fitbit_api_token',
      expect.any(String) // Don't need to check exact content, just that it was called
    );
    
    // Check that user profile was fetched
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.fitbit.com/1/user/-/profile.json',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer abc123'
        })
      })
    );
  });

  it('should return false for invalid callback URL', async () => {
    // Invalid callback URL (no access token)
    const callbackUrl = 'https://moodmusicapp.netlify.app/?error=invalid_request';
    
    // Call the method
    const result = await FitbitAuthService.handleAuthorizationCallback(callbackUrl);
    
    // Check result
    expect(result).toBe(false);
    
    // Check that no storage operations were performed
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should check for valid tokens', async () => {
    // Scenario 1: No stored token
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
    expect(await FitbitAuthService.hasValidTokens()).toBe(false);
    
    // Scenario 2: Valid token
    const validToken = {
      accessToken: 'validToken',
      refreshToken: '',
      expiresAt: Date.now() + 3600000, // 1 hour in the future
    };
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(validToken));
    expect(await FitbitAuthService.hasValidTokens()).toBe(true);
    
    // Scenario 3: Expired token
    const expiredToken = {
      accessToken: 'expiredToken',
      refreshToken: '',
      expiresAt: Date.now() - 3600000, // 1 hour in the past
    };
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(expiredToken));
    expect(await FitbitAuthService.hasValidTokens()).toBe(false);
  });

  it('should trigger authorization flow', async () => {
    // Call the method
    await FitbitAuthService.authorize();
    
    // Check that Linking.openURL was called with proper URL
    expect(ExpoLinking.openURL).toHaveBeenCalledWith(expect.stringContaining('https://www.fitbit.com/oauth2/authorize'));
  });

  it('should disconnect device', async () => {
    // Call the method
    await FitbitAuthService.disconnectDevice();
    
    // Check that tokens were removed
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('fitbit_api_token');
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('connected_fitbit_device');
  });
});