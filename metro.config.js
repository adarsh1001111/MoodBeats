const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Increase the max workers
config.maxWorkers = 4;

// Optimize file reading
config.transformer.assetPlugins = ['expo-asset/tools/hashAssetFiles'];

// Add any file extensions you're using
config.resolver.sourceExts = ['js', 'jsx', 'ts', 'tsx', 'json'];

// Avoid unnecessary processing
config.resolver.blockList = [/\/node_modules\/.*\/node_modules\/react-native\/.*/];

// Improve caching
config.cacheStores = [];

module.exports = config;