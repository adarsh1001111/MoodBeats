import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Song, Playlist, mockSongs, mockPlaylists, mockMoodRecommendations } from '../utils/mockMusicData';

// Constants
const RECENTLY_PLAYED_KEY = 'recently_played';
const API_ENDPOINT = 'https://api.example.com/moodbeats';
const API_KEY = 'YOUR_API_KEY'; // Replace with your actual API key

// For managing audio playback
let sound: Audio.Sound | null = null;
let currentSongId: string | null = null;

// Timer to simulate playback progress
let playbackTimer: NodeJS.Timeout | null = null;
let currentPosition = 0;
let totalDuration = 0;

/**
 * Music Service adapted for Expo
 * Handles music playback, playlist management, and recommendations
 */
class MusicService {
  static isInitialized = false;
  
  /**
   * Initialize the music service
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    try {
      // Setup audio player
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing music service:', error);
    }
  }
  
  /**
   * Get recently played songs
   */
  static async getRecentlyPlayed(limit = 10): Promise<Song[]> {
    try {
      await this.initialize();
      
      // Try to get from storage
      const historyJson = await AsyncStorage.getItem(RECENTLY_PLAYED_KEY);
      let history: Song[] = historyJson ? JSON.parse(historyJson) : [];
      
      // For demo purposes, we'll use mock data
      if (history.length === 0) {
        return mockSongs.slice(0, limit);
      }
      
      // Return most recent songs up to the limit
      return history.slice(-limit).reverse();
    } catch (error) {
      console.error('Error getting recently played:', error);
      return mockSongs.slice(0, limit);
    }
  }
  
  /**
   * Get recommended songs based on mood or seed song
   */
  static async getRecommendedSongs({ mood, songId }: { mood?: string; songId?: string } = {}): Promise<Song[]> {
    try {
      await this.initialize();
      
      // Use mock recommendations
      if (mood && mockMoodRecommendations[mood]) {
        return mockMoodRecommendations[mood];
      } else if (songId) {
        // Simulate recommendations based on song ID
        const shuffled = [...mockSongs].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, 5);
      }
      
      return mockSongs.slice(0, 5);
    } catch (error) {
      console.error('Error getting recommendations:', error);
      return mockSongs.slice(0, 5);
    }
  }
  
  /**
   * Get all available playlists
   */
  static async getAllPlaylists(): Promise<Playlist[]> {
    try {
      await this.initialize();
      return mockPlaylists;
    } catch (error) {
      console.error('Error getting playlists:', error);
      return mockPlaylists;
    }
  }
  
  /**
   * Get mood-specific playlists
   */
  static async getMoodPlaylists(): Promise<Playlist[]> {
    try {
      const allPlaylists = await this.getAllPlaylists();
      
      // Filter playlists by mood categories
      return allPlaylists.filter(playlist => playlist.category === 'mood');
    } catch (error) {
      console.error('Error getting mood playlists:', error);
      return mockPlaylists.filter(playlist => playlist.category === 'mood');
    }
  }
  
  /**
   * Get a specific playlist by ID
   */
  static async getPlaylist(playlistId: string): Promise<Playlist> {
    try {
      await this.initialize();
      
      // Find in mock playlists
      const mockPlaylist = mockPlaylists.find(p => p.id === playlistId);
      
      if (mockPlaylist) {
        // Add songs to the playlist
        return {
          ...mockPlaylist,
          songs: mockSongs.slice(0, mockPlaylist.songCount),
        };
      }
      
      throw new Error(`Playlist with ID ${playlistId} not found`);
    } catch (error) {
      console.error('Error getting playlist:', error);
      throw error;
    }
  }
  
  /**
   * Play a specific song - simulated for demo without actual audio
   */
  static async playSong(songId: string, position = 0): Promise<Song> {
    try {
      await this.initialize();
      
      // Find the song details
      const song = mockSongs.find(s => s.id === songId);
      
      if (!song) {
        throw new Error(`Song with ID ${songId} not found`);
      }
      
      // Clear any existing playback timer
      if (playbackTimer) {
        clearInterval(playbackTimer);
        playbackTimer = null;
      }
      
      // If we already have a sound playing, unload it
      if (sound) {
        try {
          await sound.unloadAsync();
        } catch (e) {
          // Ignore errors from unloading
          console.log("Error unloading previous sound, continuing...");
        }
        sound = null;
      }
      
      // For demonstration, we'll simulate playback without loading an actual file
      currentSongId = songId;
      currentPosition = position;
      totalDuration = song.duration;
      
      // Create a timer to simulate playback progress
      playbackTimer = setInterval(() => {
        currentPosition += 1;
        if (currentPosition >= totalDuration) {
          // Auto-advance to next song when finished
          this.skipToNext().catch(e => console.error("Error auto-advancing to next song:", e));
        }
      }, 1000);
      
      // Add to recently played history
      this._addToRecentlyPlayed(song);
      
      // In a real app, we would load and play the actual audio file
      console.log(`[SIMULATED] Playing song: ${song.title} by ${song.artist}`);
      
      return song;
    } catch (error) {
      console.error('Error playing song:', error);
      throw error;
    }
  }
  
  /**
   * Pause the current song
   */
  static async pauseSong(): Promise<void> {
    try {
      // For demonstration, pause the simulated playback timer
      if (playbackTimer) {
        clearInterval(playbackTimer);
        playbackTimer = null;
      }
      
      // In a real app, we would pause the actual audio playback
      console.log("[SIMULATED] Paused playback");
      
      if (sound) {
        try {
          await sound.pauseAsync();
        } catch (e) {
          // Ignore errors from pausing
          console.log("Error pausing sound, continuing simulation...");
        }
      }
    } catch (error) {
      console.error('Error pausing song:', error);
    }
  }
  
  /**
   * Skip to the next song (simulated)
   */
  static async skipToNext(): Promise<Song> {
    try {
      // Get current song index
      const currentIndex = mockSongs.findIndex(s => s.id === currentSongId);
      const nextIndex = (currentIndex + 1) % mockSongs.length;
      const nextSong = mockSongs[nextIndex];
      
      // Play the next song
      await this.playSong(nextSong.id);
      
      return nextSong;
    } catch (error) {
      console.error('Error skipping to next song:', error);
      throw error;
    }
  }
  
  /**
   * Skip to the previous song (simulated)
   */
  static async skipToPrevious(): Promise<Song> {
    try {
      // Get current song index
      const currentIndex = mockSongs.findIndex(s => s.id === currentSongId);
      const prevIndex = (currentIndex - 1 + mockSongs.length) % mockSongs.length;
      const prevSong = mockSongs[prevIndex];
      
      // Play the previous song
      await this.playSong(prevSong.id);
      
      return prevSong;
    } catch (error) {
      console.error('Error skipping to previous song:', error);
      throw error;
    }
  }
  
  /**
   * Add a song to recently played history
   * @private
   */
  static async _addToRecentlyPlayed(song: Song): Promise<void> {
    try {
      // Get existing history
      const historyJson = await AsyncStorage.getItem(RECENTLY_PLAYED_KEY);
      let history: Song[] = historyJson ? JSON.parse(historyJson) : [];
      
      // Remove if song is already in history
      history = history.filter(item => item.id !== song.id);
      
      // Add song to end of history
      history.push({
        id: song.id,
        title: song.title,
        artist: song.artist,
        artwork: song.artwork,
        duration: song.duration,
      } as Song);
      
      // Keep only last 20 songs
      if (history.length > 20) {
        history = history.slice(-20);
      }
      
      // Store updated history
      await AsyncStorage.setItem(RECENTLY_PLAYED_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Error adding to recently played:', error);
    }
  }
  
  /**
   * Clean up resources
   */
  static async cleanup(): Promise<void> {
    // Clear playback timer
    if (playbackTimer) {
      clearInterval(playbackTimer);
      playbackTimer = null;
    }
    
    // Unload sound
    if (sound) {
      try {
        await sound.unloadAsync();
      } catch (e) {
        // Ignore errors from unloading
      }
      sound = null;
    }
    
    currentSongId = null;
    currentPosition = 0;
    totalDuration = 0;
  }
}

export default MusicService;