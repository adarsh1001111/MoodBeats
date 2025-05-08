// src/services/EnhancedMusicService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Song, Playlist, mockSongs, mockPlaylists } from '../utils/mockMusicData';
import MoodPredictionService from './MoodPredictionService';
import AudioPlayerService from './AudioPlayerService';
import MoodFolderService, { MoodType } from './MoodFolderService';

// Keys for storing data
const RECENTLY_PLAYED_KEY = 'recently_played';
const USER_PLAYLISTS_KEY = 'user_playlists';

// Enhanced Music Service that integrates the real audio player and mood folders
class EnhancedMusicService {
  private static instance: EnhancedMusicService;
  private audioPlayer: AudioPlayerService;
  private moodFolderService: MoodFolderService;
  private userPlaylists: Playlist[] = [];
  private isInitialized: boolean = false;

  // Private constructor for singleton pattern
  private constructor() {
    this.audioPlayer = AudioPlayerService.getInstance();
    this.moodFolderService = MoodFolderService.getInstance();
  }

  // Get singleton instance
  public static getInstance(): EnhancedMusicService {
    if (!EnhancedMusicService.instance) {
      EnhancedMusicService.instance = new EnhancedMusicService();
    }
    return EnhancedMusicService.instance;
  }

  // Initialize the service
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize mood folder service
      await this.moodFolderService.initialize();
      
      // Load user playlists from storage
      const playlistsJson = await AsyncStorage.getItem(USER_PLAYLISTS_KEY);
      if (playlistsJson) {
        this.userPlaylists = JSON.parse(playlistsJson);
      }
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing enhanced music service:', error);
    }
  }
  
  // Save user playlists to storage
  private async saveUserPlaylists(): Promise<void> {
    try {
      const playlistsJson = JSON.stringify(this.userPlaylists);
      await AsyncStorage.setItem(USER_PLAYLISTS_KEY, playlistsJson);
    } catch (error) {
      console.error('Error saving user playlists:', error);
    }
  }

  // Get recently played songs
  public async getRecentlyPlayed(limit = 10): Promise<Song[]> {
    await this.initialize();
    
    try {
      // Try to get from storage
      const historyJson = await AsyncStorage.getItem(RECENTLY_PLAYED_KEY);
      let history: Song[] = historyJson ? JSON.parse(historyJson) : [];
      
      // If history is empty, use mock data for demonstration
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
  
  // Add a song to recently played history
  private async addToRecentlyPlayed(song: Song): Promise<void> {
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
        audioUrl: song.audioUrl
      });
      
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

  // Get song details by ID
  public async getSongById(songId: string): Promise<Song | null> {
    await this.initialize();
    
    // First check if the song exists in our mock data (temporary until we have a real API)
    const mockSong = mockSongs.find(s => s.id === songId);
    if (mockSong) {
      return { ...mockSong };
    }
    
    // Check in recently played
    const recentlyPlayed = await this.getRecentlyPlayed(20);
    const recentSong = recentlyPlayed.find(s => s.id === songId);
    if (recentSong) {
      return { ...recentSong };
    }
    
    // Check in all mood folders
    const allSongs = await this.moodFolderService.getAllSongs();
    const folderSong = allSongs.find(s => s.id === songId);
    if (folderSong) {
      return { ...folderSong };
    }
    
    // If we can't find it, return null
    return null;
  }

  // Play a song and maintain state
  public async playSong(songId: string, position: number = 0): Promise<Song | null> {
    await this.initialize();
    
    // Get song details
    const song = await this.getSongById(songId);
    if (!song) {
      console.error('Song not found:', songId);
      return null;
    }
    
    try {
      // If the song doesn't have an audio URL, set a fake one
      const audioUrl = song.audioUrl || `https://example.com/tracks/${song.id}.mp3`;
      
      // Load the song into the player
      const loaded = await this.audioPlayer.loadSong(songId, audioUrl, position);
      if (!loaded) {
        console.error('Failed to load song:', songId);
        return null;
      }
      
      // Start playback
      await this.audioPlayer.play();
      
      // Add to recently played
      await this.addToRecentlyPlayed(song);
      
      return song;
    } catch (error) {
      console.error('Error playing song:', error);
      // Even if we encounter an error, return the song so the UI can display it
      return song;
    }
  }

  // Pause the current song
  public async pauseSong(): Promise<boolean> {
    return this.audioPlayer.pause();
  }

  // Resume playing the current song
  public async resumeSong(): Promise<boolean> {
    return this.audioPlayer.play();
  }

  // Seek to position in the current song
  public async seekTo(position: number): Promise<boolean> {
    return this.audioPlayer.seekTo(position);
  }

  // Skip to the next song
  public async skipToNext(): Promise<Song | null> {
    const result = await this.audioPlayer.playNext();
    if (!result) return null;
    
    // The next song ID should be loaded from the event emitted by the player
    // But for now, we'll just get the current queue
    const status = this.audioPlayer.getStatus();
    if (!status.currentSongId) return null;
    
    return this.playSong(status.currentSongId);
  }

  // Skip to the previous song
  public async skipToPrevious(): Promise<Song | null> {
    const result = await this.audioPlayer.playPrevious();
    if (!result) return null;
    
    // The previous song ID should be loaded from the event emitted by the player
    // But for now, we'll just get the current queue
    const status = this.audioPlayer.getStatus();
    if (!status.currentSongId) return null;
    
    return this.playSong(status.currentSongId);
  }

  // Get recommended songs based on mood
  public async getRecommendedSongs(
    params: { mood?: MoodType | string; songId?: string; limit?: number } = {}
  ): Promise<Song[]> {
    await this.initialize();
    
    const { mood, songId, limit = 10 } = params;
    let recommendations: Song[] = [];
    
    // If a mood is provided, get songs from that mood folder
    if (mood) {
      // Convert mood to MoodType if possible
      const moodType = mood as MoodType;
      const folder = await this.moodFolderService.getFolderByMood(moodType);
      
      if (folder) {
        recommendations = await this.moodFolderService.getSongsFromFolder(folder.id);
      }
    }
    
    // If a specific song ID is provided, find similar songs
    if (songId && recommendations.length === 0) {
      const song = await this.getSongById(songId);
      if (song) {
        // Try to predict a mood for this song
        // This is a placeholder until we have a real recommendation system
        const allSongs = await this.moodFolderService.getAllSongs();
        recommendations = allSongs
          .filter(s => s.id !== songId) // Exclude the current song
          .filter(s => s.genre === song.genre) // Filter by same genre
          .slice(0, limit);
      }
    }
    
    // If we still don't have enough recommendations, add some mock songs
    if (recommendations.length < limit) {
      // Filter out songs that are already in recommendations
      const existingIds = recommendations.map(s => s.id);
      const additionalSongs = mockSongs
        .filter(s => !existingIds.includes(s.id))
        .slice(0, limit - recommendations.length);
      
      recommendations = [...recommendations, ...additionalSongs];
    }
    
    // Limit to specified number
    return recommendations.slice(0, limit);
  }

  // Play songs for a specific mood
  public async playMoodBasedSongs(mood: MoodType): Promise<Song | null> {
    await this.initialize();
    
    // Get songs for this mood
    const folder = await this.moodFolderService.getFolderByMood(mood);
    if (!folder) return null;
    
    const songs = await this.moodFolderService.getSongsFromFolder(folder.id);
    if (songs.length === 0) {
      // If no songs in folder, get recommendations
      const recommendations = await this.getRecommendedSongs({ mood, limit: 10 });
      if (recommendations.length === 0) return null;
      
      // Set the queue and play the first song
      const songIds = recommendations.map(s => s.id);
      this.audioPlayer.setQueue(songIds, 0);
      return this.playSong(songIds[0]);
    }
    
    // Set the queue and play the first song
    const songIds = songs.map(s => s.id);
    this.audioPlayer.setQueue(songIds, 0);
    return this.playSong(songIds[0]);
  }

  // Add a song to a mood folder
  public async addSongToMoodFolder(songId: string, mood: MoodType): Promise<boolean> {
    await this.initialize();
    
    const song = await this.getSongById(songId);
    if (!song) return false;
    
    return this.moodFolderService.addSongToMoodFolder(song, mood);
  }

  // Get all mood folders
  public async getMoodFolders() {
    await this.initialize();
    return this.moodFolderService.getMoodFolders();
  }

  // Get songs from a specific mood folder
  public async getSongsFromMoodFolder(mood: MoodType): Promise<Song[]> {
    await this.initialize();
    
    const folder = await this.moodFolderService.getFolderByMood(mood);
    if (!folder) return [];
    
    return this.moodFolderService.getSongsFromFolder(folder.id);
  }

  // Get all playlists including user-created ones
  public async getAllPlaylists(): Promise<Playlist[]> {
    await this.initialize();
    
    // Combine mock playlists and user playlists
    return [...mockPlaylists, ...this.userPlaylists];
  }

  // Get mood-specific playlists
  public async getMoodPlaylists(): Promise<Playlist[]> {
    const allPlaylists = await this.getAllPlaylists();
    
    // Filter playlists by mood categories
    return allPlaylists.filter(playlist => playlist.category === 'mood');
  }

  // Get a specific playlist by ID
  public async getPlaylist(playlistId: string): Promise<Playlist | null> {
    await this.initialize();
    
    // Check user playlists
    const userPlaylist = this.userPlaylists.find(p => p.id === playlistId);
    if (userPlaylist) {
      // Deep copy to avoid mutating the original
      const playlist = { ...userPlaylist };
      
      // Make sure we have song details if they're not already present
      if (!playlist.songs) {
        playlist.songs = [];
        // This is a placeholder until we have a real implementation
        // We would fetch the song details for each song ID in the playlist
      }
      
      return playlist;
    }
    
    // Check mock playlists
    const mockPlaylist = mockPlaylists.find(p => p.id === playlistId);
    if (mockPlaylist) {
      // Add songs to the playlist
      return {
        ...mockPlaylist,
        songs: mockSongs.slice(0, mockPlaylist.songCount),
      };
    }
    
    return null;
  }

  // Create a new playlist
  public async createPlaylist(
    title: string,
    description: string = '',
    songIds: string[] = []
  ): Promise<Playlist> {
    await this.initialize();
    
    // Get song details if provided
    let songs: Song[] = [];
    if (songIds.length > 0) {
      const promises = songIds.map(id => this.getSongById(id));
      const results = await Promise.all(promises);
      songs = results.filter((song): song is Song => song !== null);
    }
    
    // Create playlist object
    const newPlaylist: Playlist = {
      id: `playlist-${Date.now()}`,
      title,
      description,
      coverImage: songs.length > 0 ? songs[0].artwork : 'https://picsum.photos/id/1015/400',
      category: 'user',
      songCount: songs.length,
      songs,
    };
    
    // Add to user playlists
    this.userPlaylists.push(newPlaylist);
    await this.saveUserPlaylists();
    
    return newPlaylist;
  }

  // Add songs to a playlist
  public async addSongsToPlaylist(playlistId: string, songIds: string[]): Promise<boolean> {
    await this.initialize();
    
    // Find the playlist
    const playlistIndex = this.userPlaylists.findIndex(p => p.id === playlistId);
    if (playlistIndex === -1) return false;
    
    // Get song details
    const songsToAdd: Song[] = [];
    for (const id of songIds) {
      const song = await this.getSongById(id);
      if (song) songsToAdd.push(song);
    }
    
    // Add songs to playlist
    const playlist = this.userPlaylists[playlistIndex];
    if (!playlist.songs) playlist.songs = [];
    
    // Filter out duplicates
    const existingIds = playlist.songs.map(s => s.id);
    const newSongs = songsToAdd.filter(s => !existingIds.includes(s.id));
    
    playlist.songs = [...playlist.songs, ...newSongs];
    playlist.songCount = playlist.songs.length;
    
    // Update playlist
    this.userPlaylists[playlistIndex] = playlist;
    await this.saveUserPlaylists();
    
    return true;
  }

  // Remove a song from a playlist
  public async removeSongFromPlaylist(playlistId: string, songId: string): Promise<boolean> {
    await this.initialize();
    
    // Find the playlist
    const playlistIndex = this.userPlaylists.findIndex(p => p.id === playlistId);
    if (playlistIndex === -1) return false;
    
    const playlist = this.userPlaylists[playlistIndex];
    if (!playlist.songs) return false;
    
    // Remove song from playlist
    playlist.songs = playlist.songs.filter(s => s.id !== songId);
    playlist.songCount = playlist.songs.length;
    
    // Update playlist
    this.userPlaylists[playlistIndex] = playlist;
    await this.saveUserPlaylists();
    
    return true;
  }

  // Delete a playlist
  public async deletePlaylist(playlistId: string): Promise<boolean> {
    await this.initialize();
    
    // Check if playlist exists
    const playlistIndex = this.userPlaylists.findIndex(p => p.id === playlistId);
    if (playlistIndex === -1) return false;
    
    // Remove playlist
    this.userPlaylists.splice(playlistIndex, 1);
    await this.saveUserPlaylists();
    
    return true;
  }

  // Play a playlist from the beginning
  public async playPlaylist(playlistId: string): Promise<Song | null> {
    await this.initialize();
    
    // Get playlist details
    const playlist = await this.getPlaylist(playlistId);
    if (!playlist || !playlist.songs || playlist.songs.length === 0) {
      return null;
    }
    
    // Set the queue and play the first song
    const songIds = playlist.songs.map(s => s.id);
    this.audioPlayer.setQueue(songIds, 0);
    return this.playSong(songIds[0]);
  }

  // Get the current player status
  public getPlayerStatus() {
    return this.audioPlayer.getStatus();
  }

  // Get songs by mood for HR-based recommendations
  public async getMoodBasedSongsFromHeartRate(heartRate: number): Promise<Song[]> {
    await this.initialize();
    
    // Get mood prediction from heart rate
    const mood = await MoodPredictionService.predictMood(heartRate);
    
    // Convert to MoodType if possible
    let moodType: MoodType;
    switch (mood) {
      case 'Happy':
        moodType = 'Happy';
        break;
      case 'Sad':
        moodType = 'Sad';
        break;
      case 'Energetic':
      case 'Excited':
        moodType = 'Angry'; // Map energetic to our 'Angry' category (which is more 'intense')
        break;
      case 'Calm':
      case 'Relaxed':
      case 'Focused':
        moodType = 'Relaxed';
        break;
      default:
        moodType = 'Happy'; // Default to Happy if no match
    }
    
    // Get songs from the appropriate mood folder
    return this.getSongsFromMoodFolder(moodType);
  }

  // Register event listeners for the audio player
  public addEventListener(
    event: string,
    callback: (data?: any) => void
  ): void {
    this.audioPlayer.addEventListener(event as any, callback);
  }

  // Remove event listeners
  public removeEventListener(
    event: string,
    callback: (data?: any) => void
  ): void {
    this.audioPlayer.removeEventListener(event as any, callback);
  }

  // Get the queue
  public getQueue(): string[] {
    return this.audioPlayer.getQueue();
  }

  // Clean up resources
  public async cleanup(): Promise<void> {
    await this.audioPlayer.cleanup();
  }
}

export default EnhancedMusicService;