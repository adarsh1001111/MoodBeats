// src/screens/EnhancedHomeScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  BackHandler,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import HeartRateService from '../services/HeartRateService';
import MoodPredictionService from '../services/MoodPredictionService';
import EnhancedMusicService from '../services/EnhancedMusicService';
import MoodFolderService, { MoodFolder, MoodType } from '../services/MoodFolderService';
import { Ionicons } from '@expo/vector-icons';
import { Song } from '../utils/mockMusicData';

// Define the types for our navigation props
type RootStackParamList = {
  Home: undefined;
  MoodPlayer: { mood?: MoodType; songId?: string };
  Playlist: { playlistId?: string; songs?: any[]; title?: string };
  Settings: undefined;
  FitbitConnect: undefined;
  MoodFolder: { folderId: string };
  AllMoodFolders: undefined;
};

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

type Props = {
  navigation: HomeScreenNavigationProp;
};

const EnhancedHomeScreen: React.FC<Props> = ({ navigation }) => {
  const [heartRate, setHeartRate] = useState<number | null>(null);
  const [currentMood, setCurrentMood] = useState<MoodType | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [recentlyPlayed, setRecentlyPlayed] = useState<Song[]>([]);
  const [moodFolders, setMoodFolders] = useState<MoodFolder[]>([]);
  const [fitbitConnected, setFitbitConnected] = useState<boolean>(false);

  // Function to check Fitbit connection and update state
  const checkFitbitConnection = async () => {
    try {
      // Check if Fitbit is connected
      const isConnected = await HeartRateService.isConnected();
      console.log("Fitbit connection status:", isConnected);
      setFitbitConnected(isConnected);
      
      // Initialize services
      const musicService = EnhancedMusicService.getInstance();
      const folderService = MoodFolderService.getInstance();
      await musicService.initialize();
      await folderService.initialize();
      
      if (isConnected) {
        try {
          // Get latest heart rate data
          const rate = await HeartRateService.getLatestHeartRate();
          setHeartRate(rate);
          
          // Predict mood based on heart rate
          const predictedMood = await MoodPredictionService.predictMood(rate);
          
          // Convert to our MoodType
          let moodType: MoodType;
          switch (predictedMood) {
            case 'Happy':
              moodType = 'Happy';
              break;
            case 'Sad':
              moodType = 'Sad';
              break;
            case 'Energetic':
            case 'Excited':
              moodType = 'Angry'; // Map energetic to our 'Angry' category
              break;
            case 'Calm':
            case 'Relaxed':
            case 'Focused':
              moodType = 'Relaxed';
              break;
            default:
              moodType = 'Happy'; // Default to Happy if no match
          }
          
          setCurrentMood(moodType);
        } catch (error) {
          console.error('Error fetching heart rate or predicting mood:', error);
        }
      }
      
      // Fetch music data
      try {
        const recent = await musicService.getRecentlyPlayed();
        setRecentlyPlayed(recent);
        
        const folders = await folderService.getMoodFolders();
        setMoodFolders(folders);
      } catch (error) {
        console.error('Error fetching music data:', error);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error in checkFitbitConnection:', error);
      setIsLoading(false);
    }
  };
  
  // Re-check Fitbit connection status whenever the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log("Home screen in focus - checking Fitbit connection");
      checkFitbitConnection();
      
      // Handle Android back button press
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        // Return true means we've handled the back press
        // This prevents going back to the Fitbit connection flow
        return true;
      });
      
      return () => {
        // This function runs when the screen goes out of focus
        console.log("Home screen out of focus");
        backHandler.remove();
      };
    }, [])
  );
  
  useEffect(() => {
    // Set up interval to refresh heart rate data if connected
    let heartRateInterval: NodeJS.Timeout | null = null;
    
    if (fitbitConnected) {
      heartRateInterval = setInterval(async () => {
        try {
          const rate = await HeartRateService.getLatestHeartRate();
          setHeartRate(rate);
          
          const predictedMood = await MoodPredictionService.predictMood(rate);
          
          // Convert to our MoodType
          let moodType: MoodType;
          switch (predictedMood) {
            case 'Happy':
              moodType = 'Happy';
              break;
            case 'Sad':
              moodType = 'Sad';
              break;
            case 'Energetic':
            case 'Excited':
              moodType = 'Angry'; // Map energetic to our 'Angry' category
              break;
            case 'Calm':
            case 'Relaxed':
            case 'Focused':
              moodType = 'Relaxed';
              break;
            default:
              moodType = 'Happy'; // Default to Happy if no match
          }
          
          setCurrentMood(moodType);
        } catch (error) {
          console.error('Error updating heart rate:', error);
        }
      }, 30000); // Update every 30 seconds
    }
    
    // Clean up interval on unmount or when connection status changes
    return () => {
      if (heartRateInterval) {
        clearInterval(heartRateInterval);
      }
    };
  }, [fitbitConnected]);

  const renderMoodCard = () => {
    if (!fitbitConnected) {
      return (
        <TouchableOpacity 
          style={styles.connectCard}
          onPress={() => navigation.navigate('FitbitConnect')}
        >
          <Ionicons name="watch-outline" size={40} color="#6200ea" />
          <Text style={styles.connectText}>Connect your Fitbit to get personalized music recommendations</Text>
          <Text style={styles.connectButton}>Connect Now</Text>
        </TouchableOpacity>
      );
    }
    
    if (!heartRate || !currentMood) {
      return (
        <View style={styles.moodCard}>
          <ActivityIndicator size="large" color="#6200ea" />
          <Text style={styles.loadingText}>Analyzing your mood...</Text>
        </View>
      );
    }
    
    return (
      <TouchableOpacity 
        style={[styles.moodCard, { backgroundColor: getMoodColor(currentMood) }]}
        onPress={() => navigation.navigate('MoodPlayer', { mood: currentMood })}
      >
        <View style={styles.moodInfo}>
          <Ionicons name="heart" size={24} color="#fff" />
          <Text style={styles.heartRateText}>{heartRate} BPM</Text>
        </View>
        <Text style={styles.moodText}>Your current mood: {currentMood}</Text>
        <Text style={styles.playText}>PLAY MUSIC FOR YOUR MOOD</Text>
      </TouchableOpacity>
    );
  };

  // Helper function to get color based on mood
  const getMoodColor = (mood: MoodType): string => {
    const folderService = MoodFolderService.getInstance();
    return folderService.getMoodColor(mood);
  };

  // Render a mood folder item
  const renderMoodFolderItem = ({ item }: { item: MoodFolder }) => (
    <TouchableOpacity 
      style={styles.folderCard}
      onPress={() => navigation.navigate('MoodFolder', { folderId: item.id })}
    >
      <View 
        style={[
          styles.folderIconContainer, 
          { backgroundColor: item.color }
        ]}
      >
        <Ionicons name={item.icon} size={32} color="#fff" />
      </View>
      <Text style={styles.folderTitle}>{item.title}</Text>
      <Text style={styles.folderSongCount}>{item.songs.length} songs</Text>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ea" />
        <Text style={styles.loadingText}>Loading your MoodBeats experience...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderMoodCard()}
        
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Mood Folders</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('AllMoodFolders')}
            >
              <Text style={styles.sectionLink}>See All</Text>
            </TouchableOpacity>
          </View>
          
          <FlatList
            horizontal
            data={moodFolders}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            renderItem={renderMoodFolderItem}
          />
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recently Played</Text>
          <FlatList
            horizontal
            data={recentlyPlayed}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.songCard}
                onPress={() => navigation.navigate('MoodPlayer', { songId: item.id })}
              >
                <Image source={{ uri: item.artwork }} style={styles.albumArt} />
                <Text style={styles.songTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.artistName} numberOfLines={1}>{item.artist}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
        
        {/* Add padding at the bottom to ensure content is visible above the nav bar */}
        <View style={styles.bottomPadding} />
      </ScrollView>
      
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="home" size={26} color="#6200ea" />
          <Text style={[styles.navText, styles.activeNavText]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => navigation.navigate('Playlist')}
        >
          <Ionicons name="musical-notes-outline" size={26} color="#757575" />
          <Text style={styles.navText}>Playlists</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => navigation.navigate('Settings')}
        >
          <Ionicons name="settings-outline" size={26} color="#757575" />
          <Text style={styles.navText}>Settings</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    paddingBottom: 20,  // Add padding to ensure content doesn't get cut off
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    color: '#757575',
    fontSize: 16,
  },
  moodCard: {
    margin: 16,
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#6200ea',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    alignItems: 'center',
  },
  connectCard: {
    margin: 16,
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    alignItems: 'center',
  },
  connectText: {
    fontSize: 16,
    color: '#424242',
    marginVertical: 12,
    textAlign: 'center',
  },
  connectButton: {
    fontSize: 16,
    color: '#6200ea',
    fontWeight: 'bold',
    marginTop: 8,
  },
  moodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  heartRateText: {
    fontSize: 16,
    color: '#fff',
    marginLeft: 8,
  },
  moodText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  playText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginTop: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212121',
  },
  sectionLink: {
    fontSize: 14,
    color: '#6200ea',
    fontWeight: '500',
  },
  songCard: {
    width: 150,
    marginLeft: 16,
    marginRight: 4,
  },
  albumArt: {
    width: 150,
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
  },
  songTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#212121',
  },
  artistName: {
    fontSize: 12,
    color: '#757575',
  },
  folderCard: {
    width: 120,
    marginLeft: 16,
    marginRight: 4,
    alignItems: 'center',
  },
  folderIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  folderTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#212121',
    textAlign: 'center',
  },
  folderSongCount: {
    fontSize: 12,
    color: '#757575',
    textAlign: 'center',
  },
  bottomPadding: {
    height: 80, // Add enough padding to account for the bottom nav
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingVertical: 8,
    justifyContent: 'space-around',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  navItem: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  navText: {
    fontSize: 12,
    marginTop: 4,
    color: '#757575',
  },
  activeNavText: {
    color: '#6200ea',
    fontWeight: 'bold',
  },
});

export default EnhancedHomeScreen;