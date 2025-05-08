#!/bin/bash
# Make the script executable: chmod +x fix_random_deprecation.sh
# Run the script: ./fix_random_deprecation.sh

# Fix for expo-random deprecation in MoodBeats app
echo "Applying expo-random deprecation fix..."

# Check if the directory structure exists
if [ ! -d "./src/utils" ]; then
  echo "Creating utils directory..."
  mkdir -p ./src/utils
fi

# Create the ExpoRandomShim.ts file
echo "Creating ExpoRandomShim.ts..."
cat > ./src/utils/ExpoRandomShim.ts << 'EOF'
/**
 * ExpoRandomShim.ts
 * 
 * This file provides a compatibility shim for expo-random, using expo-crypto instead.
 * It replaces the deprecated expo-random functions with their expo-crypto equivalents.
 */
import * as Crypto from 'expo-crypto';

// Add TypeScript global declaration to avoid type errors
declare global {
  var ExpoRandom: {
    getRandomBytesAsync: (byteCount: number) => Promise<Uint8Array>;
    assertByteCount: (byteCount: number) => void;
  };
}

// Create a global ExpoRandom object with the needed methods
const ExpoRandom = {
  // Replacement for random's getRandomBytesAsync
  getRandomBytesAsync: async (byteCount: number): Promise<Uint8Array> => {
    console.log('Using Crypto.getRandomBytesAsync instead of Random.getRandomBytesAsync');
    return await Crypto.getRandomBytesAsync(byteCount);
  },

  // Replacement for random's assertByteCount
  assertByteCount: (byteCount: number): void => {
    console.log('Using Crypto compatibility check instead of Random.assertByteCount');
    if (byteCount <= 0) {
      throw new Error(`The byteCount ${ byteCount } is invalid; expected a value greater than 0.`);
    }
  }
};

// Make it globally available
global.ExpoRandom = ExpoRandom;

export default ExpoRandom;
EOF

# Modify App.tsx to import our shim
echo "Updating App.tsx..."
sed -i.bak '1s/^/\/\/ Import our ExpoRandom shim first to ensure it is available before any other code runs\nimport "\.\/src\/utils\/ExpoRandomShim";\n\n/' App.tsx

# Create documentation
echo "Creating documentation..."
cat > ./EXPO_RANDOM_FIX.md << 'EOF'
# Fixing expo-random Deprecation Issues

This document explains the fixes implemented to resolve the `expo-random` deprecation warnings and errors in the MoodBeats app.

## Problem

The app was displaying the following warnings and errors during the Fitbit authentication process:

```
WARN expo-random is deprecated in favor of expo-crypto: use ExpoCrypto.getRandomBytesAsync() instead. https://docs.expo.dev/versions/latest/sdk/crypto/
WARN expo-random is deprecated in favor of expo-crypto: use ExpoCrypto.assertByteCount() instead. https://docs.expo.dev/versions/latest/sdk/crypto/
ERROR Error authorizing with Fitbit: [TypeError: Cannot read property 'getRandomBytesAsync' of null]
```

This was occurring because:
1. The `expo-random` package is now deprecated
2. Some dependencies were still trying to use it
3. The OAuth PKCE flow requires secure random number generation

## Solution

We implemented the following fixes:

1. **ExpoRandomShim**: Created a compatibility shim that provides the `expo-random` functions using `expo-crypto` equivalents:
   - Located at `src/utils/ExpoRandomShim.ts`
   - Implements `getRandomBytesAsync` and `assertByteCount` using `expo-crypto`
   - Makes these functions globally available via `global.ExpoRandom`

2. **Early Loading**: Imported the shim at the very beginning of `App.tsx` to ensure it's available before any other code runs.

3. **Direct Crypto Usage**: Updated `FitbitAuthService.ts` to use `expo-crypto` directly with fallbacks.

4. **Robust Token Handling**: Enhanced token extraction and validation to handle edge cases better.

## How to Test

1. Open the app and go to the Fitbit Connect screen
2. Tap "Sign in with Fitbit"
3. Complete authentication on the Fitbit website
4. The app should successfully redirect and connect to your Fitbit account without errors

If automatic connection fails:
1. The token will be displayed on the Netlify page
2. Use the "Manual Token Entry" option in the app
3. Paste the token and connect manually

This fix ensures the app works correctly with newer versions of Expo while maintaining compatibility with the Fitbit OAuth implementation.
EOF

echo "Fix applied successfully!"
echo "Please read EXPO_RANDOM_FIX.md for details on the changes."
