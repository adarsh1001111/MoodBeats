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
    try {
      console.log('Using Crypto.getRandomBytesAsync instead of Random.getRandomBytesAsync');
      return await Crypto.getRandomBytesAsync(byteCount);
    } catch (error) {
      console.error('Error in ExpoRandom.getRandomBytesAsync:', error);
      
      // Fallback implementation using Math.random
      console.warn('Falling back to Math.random implementation (less secure)');
      const randomBytes = new Uint8Array(byteCount);
      for (let i = 0; i < byteCount; i++) {
        randomBytes[i] = Math.floor(Math.random() * 256);
      }
      return randomBytes;
    }
  },

  // Replacement for random's assertByteCount
  assertByteCount: (byteCount: number): void => {
    console.log('Using assertByteCount compatibility check');
    if (byteCount <= 0) {
      throw new Error(`The byteCount ${byteCount} is invalid; expected a value greater than 0.`);
    }
  }
};

// Make it globally available
global.ExpoRandom = ExpoRandom;

export default ExpoRandom;
