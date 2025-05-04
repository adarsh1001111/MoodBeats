import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import HeartRateService from '../services/HeartRateService';
import MoodPredictionService from '../services/MoodPredictionService';
import MusicService from '../services/MusicService';
import { Ionicons } from '@expo/vector-icons';

// Define the types for our navigation props
type RootStackParamList = {
  Home: undefined;
  MoodPlayer: { mood?: string; songId?: string };
  Playlist: { playlistId?: string; songs?: any[]; title?: string };
  Settings: undefined;
  FitbitConnect: undefined;
};

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

type Props = {
  navigation: HomeScreenNavigationProp;
};

// Define the types for our song and playlist data
interface Song {
  id: string;
  title: string;
  artist: string;
  artwork: string;
}

interface Playlist {
  id: string;
  title: string;
  description?: string;
  coverImage: string;
  songCount: number;
  category?: string;
}

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const [heartRate, setHeartRate] = useState<number | null>(null);
  const [currentMood, setCurrentMood] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [recentlyPlayed, setRecentlyPlayed] = useState<Song[]>([]);
  const [moodPlaylists, setMoodPlaylists] = useState<Playlist[]>([]);
  const [fitbitConnected, setFitbitConnected] = useState<boolean>(false);

  useEffect(() => {
    // Check if Fitbit is connected
    const checkFitbitConnection = async () => {
      const isConnected = await HeartRateService.isConnected();
      setFitbitConnected(isConnected);
      
      if (isConnected) {
        try {
          // Get latest heart rate data
          const rate = await HeartRateService.getLatestHeartRate();
          setHeartRate(rate);
          
          // Predict mood based on heart rate
          const mood = await MoodPredictionService.predictMood(rate);
          setCurrentMood(mood);
        } catch (error) {
          console.error('Error fetching heart rate or predicting mood:', error);
        }
      }
      
      // Fetch music data
      try {
        const recent = await MusicService.getRecentlyPlayed();
        setRecentlyPlayed(recent);
        
        const playlists = await MusicService.getMoodPlaylists();
        setMoodPlaylists(playlists);
      } catch (error) {
        console.error('Error fetching music data:', error);
      }
      
      setIsLoading(false);
    };
    
    checkFitbitConnection();
    
    // Set up interval to refresh heart rate data
    const heartRateInterval = setInterval(async () => {
      if (fitbitConnected) {
        try {
          const rate = await HeartRateService.getLatestHeartRate();
          setHeartRate(rate);
          
          const mood = await MoodPredictionService.predictMood(rate);
          setCurrentMood(mood);
        } catch (error) {
          console.error('Error updating heart rate:', error);
        }
      }
    }, 30000); // Update every 30 seconds
    
    // Clean up interval on unmount
    return () => clearInterval(heartRateInterval);
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
  const getMoodColor = (mood: string): string => {
    const colors: Record<string, string> = {
      'Happy': '#4CAF50',
      'Sad': '#5C6BC0',
      'Energetic': '#FF9800',
      'Calm': '#26A69A',
      'Focused': '#7E57C2',
      'Relaxed': '#66BB6A',
      'Excited': '#F44336',
    };
    return colors[mood] || '#6200ea';
  };

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
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mood Playlists</Text>
          <FlatList
            horizontal
            data={moodPlaylists}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.playlistCard}
                onPress={() => navigation.navigate('Playlist', { playlistId: item.id })}
              >
                <Image source={{ uri: item.coverImage }} style={styles.playlistCover} />
                <Text style={styles.playlistTitle}>{item.title}</Text>
                <Text style={styles.playlistDescription}>{item.songCount} songs</Text>
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212121',
    paddingHorizontal: 16,
    marginBottom: 12,
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
  playlistCard: {
    width: 180,
    marginLeft: 16,
    marginRight: 4,
  },
  playlistCover: {
    width: 180,
    height: 180,
    borderRadius: 8,
    marginBottom: 8,
  },
  playlistTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
  },
  playlistDescription: {
    fontSize: 12,
    color: '#757575',
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

export default HomeScreen;