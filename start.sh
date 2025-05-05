#!/bin/bash

# Clear caches and start the Expo application
echo "🧹 Cleaning up Metro bundler cache..."
rm -rf $TMPDIR/metro-*
rm -rf $TMPDIR/haste-map-*

echo "🧹 Clearing watchman watches..."
watchman watch-del-all

echo "🧹 Cleaning npm cache..."
npm cache clean --force

echo "🚀 Starting Expo application..."
npx expo start --reset-cache
