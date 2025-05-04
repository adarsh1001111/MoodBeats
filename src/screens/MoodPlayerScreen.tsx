import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import MoodPredictionService from '../services/MoodPredictionService';
import HeartRateService from '../services/HeartRateService';
import MusicService from '../services/MusicService';

const { width } = Dimensions.get('window');

// Define the types for our navigation and route props
type RootStackParamList = {
  Home: undefined;
  MoodPlayer: { mood?: string; songId?: string };
  Playlist: { playlistId?: string; songs?: any[]; title?: string };
  Settings: undefined;
  FitbitConnect: undefined;
};

type MoodPlayerScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'MoodPlayer'
>;

type MoodPlayerScreenRouteProp = RouteProp<RootStackParamList, 'MoodPlayer'>;

type Props = {
  navigation: MoodPlayerScreenNavigationProp;
  route: MoodPlayerScreenRouteProp;
};

// Define the types for our song data
interface Song {
  id: string;
  title: string;
  artist: string;
  artwork: string;
  duration: number;
  audioUrl?: string;
}

const MoodPlayerScreen: React.FC<Props> = ({ route, navigation }) => {
  const { mood, songId } = route.params || {};
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [recommendedSongs, setRecommendedSongs] = useState<Song[]>([]);
  const [currentMood, setCurrentMood] = useState<string | null>(mood || null);

  useEffect(() => {
    // Load music based on mood or songId
    const loadMusic = async () => {
      setIsLoading(true);
      
      try {
        let songs: Song[] = [];
        
        // If a specific song ID was provided, play that song
        if (songId) {
          const songDetails = await MusicService.playSong(songId);
          setCurrentSong(songDetails);
          setIsPlaying(true);
          setDuration(songDetails.duration);
          songs = await MusicService.getRecommendedSongs({ songId });
        } 
        // Otherwise use mood to get recommended songs
        else if (mood) {
          songs = await MusicService.getRecommendedSongs({ mood });
          if (songs.length > 0) {
            const firstSong = songs[0];
            await MusicService.playSong(firstSong.id);
            setCurrentSong(firstSong);
            setIsPlaying(true);
            setDuration(firstSong.duration);
          }
        }
        
        setRecommendedSongs(songs);
      } catch (error) {
        console.error('Error loading music:', error);
      }
      
      setIsLoading(false);
    };
    
    loadMusic();
    
    // Set up progress update interval for the player
    const progressInterval = setInterval(() => {
      if (isPlaying && duration > 0) {
        setProgress((prev) => {
          if (prev >= duration) {
            handleNext();
            return 0;
          }
          return prev + 1;
        });
      }
    }, 1000);
    
    // Cleanup on unmount
    return () => {
      clearInterval(progressInterval);
      MusicService.cleanup();
    };
  }, [mood, songId]);

  // For refreshing recommendations based on current heartbeat
  const refreshRecommendations = async () => {
    setIsLoading(true);
    
    try {
      // Get latest heart rate
      const heartRate = await HeartRateService.getLatestHeartRate();
      // Predict new mood
      const newMood = await MoodPredictionService.predictMood(heartRate);
      setCurrentMood(newMood);
      
      // Get new song recommendations
      const songs = await MusicService.getRecommendedSongs({ mood: newMood });
      setRecommendedSongs(songs);
      
      if (songs.length > 0) {
        const firstSong = songs[0];
        await MusicService.playSong(firstSong.id);
        setCurrentSong(firstSong);
        setIsPlaying(true);
        setDuration(firstSong.duration);
        setProgress(0);
      }
    } catch (error) {
      console.error('Error refreshing recommendations:', error);
    }
    
    setIsLoading(false);
  };

  const handlePlayPause = async () => {
    if (!currentSong) return;
    
    if (isPlaying) {
      await MusicService.pauseSong();
    } else {
      await MusicService.playSong(currentSong.id, progress);
    }
    setIsPlaying(!isPlaying);
  };

  const handleNext = async () => {
    try {
      const nextSong = await MusicService.skipToNext();
      setCurrentSong(nextSong);
      setDuration(nextSong.duration);
      setProgress(0);
      setIsPlaying(true);
    } catch (error) {
      console.error('Error skipping to next song:', error);
    }
  };

  const handlePrevious = async () => {
    try {
      const prevSong = await MusicService.skipToPrevious();
      setCurrentSong(prevSong);
      setDuration(prevSong.duration);
      setProgress(0);
      setIsPlaying(true);
    } catch (error) {
      console.error('Error skipping to previous song:', error);
    }
  };

  const formatTime = (seconds: number): string => {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  // Get background color based on mood
  const getMoodColor = (mood: string | null): string => {
    if (!mood) return '#6200ea';
    
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
        <Text style={styles.loadingText}>Preparing your mood-based playlist...</Text>
      </View>
    );
  }

  if (!currentSong) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#e57373" />
        <Text style={styles.errorText}>Couldn't load music for your mood</Text>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={refreshRecommendations}
        >
          <Text style={styles.refreshButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: getMoodColor(currentMood) }]}>
      <View style={styles.headerContainer}>
        <Text style={styles.moodLabel}>Playing for your {currentMood} mood</Text>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={refreshRecommendations}
        >
          <Ionicons name="refresh" size={18} color="#fff" />
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.albumContainer}>
        <Image 
          source={{ uri: currentSong.artwork }}
          style={styles.albumArt}
        />
      </View>
      
      <View style={styles.infoContainer}>
        <Text style={styles.songTitle}>{currentSong.title}</Text>
        <Text style={styles.artistName}>{currentSong.artist}</Text>
      </View>
      
      <View style={styles.progressContainer}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={duration}
          value={progress}
          minimumTrackTintColor="#fff"
          maximumTrackTintColor="rgba(255, 255, 255, 0.3)"
          thumbTintColor="#fff"
          onSlidingComplete={(value) => {
            setProgress(value);
            MusicService.playSong(currentSong.id, value);
          }}
        />
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>{formatTime(progress)}</Text>
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>
      </View>
      
      <View style={styles.controlsContainer}>
        <TouchableOpacity style={styles.controlButton} onPress={handlePrevious}>
          <Ionicons name="play-skip-back" size={40} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.playButton} onPress={handlePlayPause}>
          <Ionicons name={isPlaying ? 'pause' : 'play'} size={50} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlButton} onPress={handleNext}>
          <Ionicons name="play-skip-forward" size={40} color="#fff" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.bottomContainer}>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="heart-outline" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="share-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={styles.upNextButton}
          onPress={() => navigation.navigate('Playlist', { 
            playlistId: 'custom', 
            songs: recommendedSongs,
            title: `${currentMood} Recommendations`
          })}
        >
          <Ionicons name="list" size={20} color="#fff" />
          <Text style={styles.upNextText}>View Full Playlist</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#6200ea',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#6200ea',
  },
  loadingText: {
    marginTop: 16,
    color: '#fff',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    marginTop: 16,
    color: '#424242',
    fontSize: 18,
    textAlign: 'center',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginTop: 12,
  },
  refreshButtonText: {
    color: '#6200ea',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  moodLabel: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  refreshText: {
    fontSize: 14,
    color: '#fff',
    marginLeft: 4,
  },
  albumContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  albumArt: {
    width: width - 80,
    height: width - 80,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  infoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  songTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  artistName: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  progressContainer: {
    marginBottom: 24,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -10,
  },
  timeText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  controlButton: {
    padding: 12,
  },
  playButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 40,
    padding: 10,
    marginHorizontal: 20,
  },
  bottomContainer: {
    marginTop: 'auto',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 10,
  },
  upNextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 24,
    paddingVertical: 12,
    marginBottom: 16,
  },
  upNextText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
});

export default MoodPlayerScreen;
