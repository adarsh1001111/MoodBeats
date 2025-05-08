// src/screens/EnhancedMoodPlayerScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import MoodPredictionService from '../services/MoodPredictionService';
import HeartRateService from '../services/HeartRateService';
import EnhancedMusicService from '../services/EnhancedMusicService';
import MoodFolderService, { MoodType } from '../services/MoodFolderService';
import { Song } from '../utils/mockMusicData';

const { width } = Dimensions.get('window');

// Define the types for our navigation and route props
type RootStackParamList = {
  Home: undefined;
  MoodPlayer: { mood?: MoodType; songId?: string };
  Playlist: { playlistId?: string; songs?: any[]; title?: string };
  Settings: undefined;
  FitbitConnect: undefined;
  MoodFolder: { folderId: string };
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

const EnhancedMoodPlayerScreen: React.FC<Props> = ({ route, navigation }) => {
  const { mood, songId } = route.params || {};
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [recommendedSongs, setRecommendedSongs] = useState<Song[]>([]);
  const [currentMood, setCurrentMood] = useState<MoodType | null>(mood || null);
  const [showQueueModal, setShowQueueModal] = useState<boolean>(false);
  const [showAddToFolderModal, setShowAddToFolderModal] = useState<boolean>(false);
  const [moodFolders, setMoodFolders] = useState<any[]>([]);
  const [queue, setQueue] = useState<string[]>([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState<number>(0);
  
  // Refs to our services
  const musicService = useRef(EnhancedMusicService.getInstance()).current;
  const moodFolderService = useRef(MoodFolderService.getInstance()).current;
  
  // Initialize screen and load music
  useEffect(() => {
    const loadMusic = async () => {
      setIsLoading(true);
      
      try {
        // Initialize music service
        await musicService.initialize();
        
        // Register for player events
        musicService.addEventListener('play', handlePlayEvent);
        musicService.addEventListener('pause', handlePauseEvent);
        musicService.addEventListener('timeupdate', handleTimeUpdateEvent);
        musicService.addEventListener('end', handleEndEvent);
        musicService.addEventListener('error', handleErrorEvent);
        
        // Get current player status to restore state if needed
        const playerStatus = musicService.getPlayerStatus();
        setIsPlaying(playerStatus.isPlaying);
        setProgress(playerStatus.position);
        setDuration(playerStatus.duration);
        setCurrentQueueIndex(playerStatus.currentQueueIndex);
        setQueue(musicService.getQueue());
        
        let songs: Song[] = [];
        
        // If a specific song ID was provided, play that song
        if (songId) {
          const song = await musicService.playSong(songId);
          if (song) {
            setCurrentSong(song);
            setIsPlaying(true);
            setDuration(song.duration);
            
            // Try to detect the mood from the song if no mood provided
            if (!mood) {
              const folders = await moodFolderService.getMoodFolders();
              for (const folder of folders) {
                const isSongInFolder = await moodFolderService.isSongInFolder(folder.id, songId);
                if (isSongInFolder) {
                  setCurrentMood(folder.mood);
                  break;
                }
              }
            }
          } else {
            // If we couldn't play the song, try to at least get its details
            const songDetails = await musicService.getSongById(songId);
            if (songDetails) {
              setCurrentSong(songDetails);
              // Display a notification that we're in simulation mode
              Alert.alert('Notice', 'Playing in simulation mode. The audio file is not available.');
            }
          }
          
          // Get recommendations based on song
          songs = await musicService.getRecommendedSongs({ songId });
        } 
        // Otherwise use mood to get recommended songs
        else if (mood) {
          // Play songs for this mood
          const firstSong = await musicService.playMoodBasedSongs(mood);
          if (firstSong) {
            setCurrentSong(firstSong);
            setIsPlaying(true);
            setDuration(firstSong.duration);
          } else {
            // Try to get any song from this mood's recommendations
            songs = await musicService.getRecommendedSongs({ mood });
            if (songs.length > 0) {
              setCurrentSong(songs[0]);
              // Try to play it
              await musicService.playSong(songs[0].id);
              setIsPlaying(true);
              setDuration(songs[0].duration);
              
              // Inform the user we're in simulation mode
              Alert.alert('Notice', 'Playing in simulation mode. Some audio files are not available.');
            }
          }
          
          // Get all songs for this mood
          if (songs.length === 0) {
            songs = await musicService.getSongsFromMoodFolder(mood);
            if (songs.length === 0) {
              // If no songs in mood folder, get recommendations
              songs = await musicService.getRecommendedSongs({ mood });
            }
          }
        }
        
        setRecommendedSongs(songs);
        
        // Load mood folders for later use
        const folders = await moodFolderService.getMoodFolders();
        setMoodFolders(folders);
      } catch (error) {
        console.error('Error loading music:', error);
        Alert.alert('Error', 'Failed to load music. Please try again.');
      }
      
      setIsLoading(false);
    };
    
    loadMusic();
    
    // Clean up event listeners when unmounting
    return () => {
      musicService.removeEventListener('play', handlePlayEvent);
      musicService.removeEventListener('pause', handlePauseEvent);
      musicService.removeEventListener('timeupdate', handleTimeUpdateEvent);
      musicService.removeEventListener('end', handleEndEvent);
      musicService.removeEventListener('error', handleErrorEvent);
    };
  }, [mood, songId]);
  
  // Event handlers for player events
  const handlePlayEvent = () => {
    setIsPlaying(true);
  };
  
  const handlePauseEvent = () => {
    setIsPlaying(false);
  };
  
  const handleTimeUpdateEvent = (data: { position: number; duration: number }) => {
    setProgress(data.position);
    setDuration(data.duration);
  };
  
  const handleEndEvent = () => {
    setIsPlaying(false);
    setProgress(0);
    
    // The player will auto-advance to the next song in the queue
    // We'll update our UI when we get the play event for the next song
  };
  
  const handleErrorEvent = (data: { error: any }) => {
    console.log('Player error:', data.error);
    // We don't need to show alerts for every error since they might be frequent
    // with non-existent files, and the simulation mode will handle playback
  };

  // For refreshing recommendations based on current heartbeat
  const refreshRecommendations = async () => {
    setIsLoading(true);
    
    try {
      // Get latest heart rate
      const heartRate = await HeartRateService.getLatestHeartRate();
      
      // Predict new mood
      const newMood = await MoodPredictionService.predictMood(heartRate);
      
      // Convert to MoodType
      let moodType: MoodType;
      switch (newMood) {
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
      
      // Play music for this mood
      const firstSong = await musicService.playMoodBasedSongs(moodType);
      if (firstSong) {
        setCurrentSong(firstSong);
        setIsPlaying(true);
        setDuration(firstSong.duration);
        setProgress(0);
      }
      
      // Get songs for this mood
      const songs = await musicService.getSongsFromMoodFolder(moodType);
      setRecommendedSongs(songs);
    } catch (error) {
      console.error('Error refreshing recommendations:', error);
      Alert.alert('Error', 'Failed to refresh recommendations. Please try again.');
    }
    
    setIsLoading(false);
  };

  const handlePlayPause = async () => {
    if (!currentSong) return;
    
    if (isPlaying) {
      await musicService.pauseSong();
    } else {
      if (progress >= duration) {
        // If we're at the end, restart the song
        await musicService.seekTo(0);
      }
      await musicService.resumeSong();
    }
  };

  const handleNext = async () => {
    try {
      const nextSong = await musicService.skipToNext();
      if (nextSong) {
        setCurrentSong(nextSong);
        setProgress(0);
        setDuration(nextSong.duration);
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error skipping to next song:', error);
    }
  };

  const handlePrevious = async () => {
    try {
      const prevSong = await musicService.skipToPrevious();
      if (prevSong) {
        setCurrentSong(prevSong);
        setProgress(0);
        setDuration(prevSong.duration);
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error skipping to previous song:', error);
    }
  };

  const handleSeek = async (value: number) => {
    try {
      await musicService.seekTo(value);
      setProgress(value);
    } catch (error) {
      console.error('Error seeking:', error);
    }
  };

  const addCurrentSongToFolder = async (folderId: string) => {
    if (!currentSong) return;
    
    try {
      // Find the folder
      const folder = moodFolders.find(f => f.id === folderId);
      if (!folder) return;
      
      // Add song to folder
      const result = await moodFolderService.addSongToFolder(folderId, currentSong);
      
      if (result) {
        Alert.alert('Success', `Added to ${folder.title}`);
      } else {
        Alert.alert('Error', 'Failed to add song to folder');
      }
    } catch (error) {
      console.error('Error adding song to folder:', error);
      Alert.alert('Error', 'Failed to add song to folder');
    }
    
    setShowAddToFolderModal(false);
  };

  const formatTime = (seconds: number): string => {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  // Get background color based on mood
  const getMoodColor = (mood: MoodType | null): string => {
    if (!mood) return '#6200ea';
    
    return moodFolderService.getMoodColor(mood);
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
    <SafeAreaView style={[styles.container, { backgroundColor: getMoodColor(currentMood) }]}>
      <View style={styles.headerContainer}>
        <Text style={styles.moodLabel}>
          {currentMood ? `Playing for your ${currentMood} mood` : 'Now Playing'}
        </Text>
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
          onSlidingComplete={handleSeek}
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
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => setShowAddToFolderModal(true)}
          >
            <Ionicons name="folder-open-outline" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="heart-outline" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => setShowQueueModal(true)}
          >
            <Ionicons name="list" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={styles.upNextButton}
          onPress={() => 
            navigation.navigate('Playlist', { 
              playlistId: 'custom', 
              songs: recommendedSongs,
              title: currentMood ? `${currentMood} Recommendations` : 'Recommendations'
            })
          }
        >
          <Ionicons name="musical-notes-outline" size={20} color="#fff" />
          <Text style={styles.upNextText}>View Full Playlist</Text>
        </TouchableOpacity>
      </View>
      
      {/* Add to Folder Modal */}
      <Modal
        visible={showAddToFolderModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddToFolderModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add to Folder</Text>
              <TouchableOpacity
                onPress={() => setShowAddToFolderModal(false)}
              >
                <Ionicons name="close" size={24} color="#424242" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={moodFolders}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.folderItem}
                  onPress={() => addCurrentSongToFolder(item.id)}
                >
                  <View style={[styles.folderIcon, { backgroundColor: item.color }]}>
                    <Ionicons name={item.icon} size={24} color="#fff" />
                  </View>
                  <Text style={styles.folderTitle}>{item.title}</Text>
                  <Ionicons name="chevron-forward" size={24} color="#bdbdbd" />
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
      
      {/* Queue Modal */}
      <Modal
        visible={showQueueModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowQueueModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Up Next</Text>
              <TouchableOpacity
                onPress={() => setShowQueueModal(false)}
              >
                <Ionicons name="close" size={24} color="#424242" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={recommendedSongs}
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => (
                <TouchableOpacity 
                  style={[
                    styles.queueItem,
                    currentSong && item.id === currentSong.id ? styles.currentQueueItem : null
                  ]}
                  onPress={async () => {
                    await musicService.playSong(item.id);
                    setCurrentSong(item);
                    setIsPlaying(true);
                    setDuration(item.duration);
                    setProgress(0);
                    setShowQueueModal(false);
                  }}
                >
                  <Image source={{ uri: item.artwork }} style={styles.queueItemArt} />
                  <View style={styles.queueItemInfo}>
                    <Text style={styles.queueItemTitle}>{item.title}</Text>
                    <Text style={styles.queueItemArtist}>{item.artist}</Text>
                  </View>
                  {currentSong && item.id === currentSong.id && (
                    <Ionicons name="musical-note" size={20} color="#6200ea" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
  },
  folderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  folderIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  folderTitle: {
    fontSize: 16,
    color: '#212121',
    flex: 1,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  currentQueueItem: {
    backgroundColor: '#f5f5f5',
  },
  queueItemArt: {
    width: 50,
    height: 50,
    borderRadius: 4,
    marginRight: 16,
  },
  queueItemInfo: {
    flex: 1,
  },
  queueItemTitle: {
    fontSize: 16,
    color: '#212121',
  },
  queueItemArtist: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4,
  },
});

export default EnhancedMoodPlayerScreen;