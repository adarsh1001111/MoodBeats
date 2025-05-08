// src/utils/NavigationService.ts
import { NavigationContainerRef } from '@react-navigation/native';

// Define the RootStackParamList type that matches the one in App.tsx
export type RootStackParamList = {
  Home: undefined;
  MoodPlayer: { mood?: string; songId?: string };
  Playlist: { playlistId?: string; songs?: any[]; title?: string };
  Settings: undefined;
  FitbitConnect: undefined;
  ManualToken: undefined;
  MoodFolder: { folderId: string };
  AllMoodFolders: undefined;
};

// Create a navigation reference holder
let navigationRef: NavigationContainerRef<RootStackParamList> | null = null;

/**
 * Sets the navigation reference for use throughout the app
 * @param ref The navigation container reference
 */
function setNavigationRef(ref: NavigationContainerRef<RootStackParamList> | null) {
  navigationRef = ref;
  // Also update global reference
  if (ref) {
    global.navigation = ref;
  }
}

/**
 * Navigate to a screen
 * @param name Screen name
 * @param params Screen params
 */
function navigate<RouteName extends keyof RootStackParamList>(
  name: RouteName,
  params?: RootStackParamList[RouteName]
) {
  if (navigationRef && navigationRef.isReady()) {
    // @ts-ignore: TypeScript has issues with complex params types here
    navigationRef.navigate(name, params);
  } else {
    console.warn('Navigation attempted before navigator was ready');
  }
}

/**
 * Reset the navigation state
 */
function reset(routeName: keyof RootStackParamList = 'Home', params?: any) {
  if (navigationRef && navigationRef.isReady()) {
    navigationRef.reset({
      index: 0,
      routes: [{ name: routeName, params }],
    });
  } else {
    console.warn('Navigation reset attempted before navigator was ready');
  }
}

/**
 * Go back in the navigation stack
 */
function goBack() {
  if (navigationRef && navigationRef.isReady() && navigationRef.canGoBack()) {
    navigationRef.goBack();
  } else {
    console.warn('Cannot go back from this screen');
  }
}

export default {
  setNavigationRef,
  navigate,
  reset,
  goBack,
};
