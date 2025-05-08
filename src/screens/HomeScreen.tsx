import React from 'react';
import EnhancedHomeScreen from './EnhancedHomeScreen';

// This file is a simple wrapper that uses our enhanced home screen
// This approach allows us to maintain backward compatibility while using our new features

const HomeScreen = (props: any) => {
  return <EnhancedHomeScreen {...props} />;
};

export default HomeScreen;