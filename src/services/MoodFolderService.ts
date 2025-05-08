// src/services/MoodFolderService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Song } from '../utils/mockMusicData';

// Available mood types
export type MoodType = 'Happy' | 'Sad' | 'Angry' | 'Relaxed';

// Mood folder structure
export interface MoodFolder {
  id: string;
  mood: MoodType;
  title: string;
  description: string;
  coverImage: string;
  songs: string[]; // Array of song IDs
  color: string;
  icon: string;
}

// Initial mood folders configuration
const initialMoodFolders: MoodFolder[] = [
  {
    id: 'folder-happy',
    mood: 'Happy',
    title: 'Happy Vibes',
    description: 'Upbeat and joyful tunes to brighten your day',
    coverImage: 'https://picsum.photos/id/1035/400',
    songs: [],
    color: '#FFC107', // Amber
    icon: 'sunny-outline',
  },
  {
    id: 'folder-sad',
    mood: 'Sad',
    title: 'Melancholy',
    description: 'Emotional and reflective songs for when you need to feel',
    coverImage: 'https://picsum.photos/id/1025/400',
    songs: [],
    color: '#5C6BC0', // Indigo
    icon: 'rainy-outline',
  },
  {
    id: 'folder-angry',
    mood: 'Angry',
    title: 'Energy Release',
    description: 'Intense tracks to channel your frustrations',
    coverImage: 'https://picsum.photos/id/1033/400',
    songs: [],
    color: '#F44336', // Red
    icon: 'flame-outline',
  },
  {
    id: 'folder-relaxed',
    mood: 'Relaxed',
    title: 'Chill Mode',
    description: 'Soothing melodies to help you unwind and destress',
    coverImage: 'https://picsum.photos/id/1050/400',
    songs: [],
    color: '#66BB6A', // Green
    icon: 'leaf-outline',
  },
];

// Storage key for mood folders
const MOOD_FOLDERS_KEY = 'mood_folders';

// Storage key for mapping song IDs to their details
const SONGS_MAP_KEY = 'songs_map';

class MoodFolderService {
  private static instance: MoodFolderService;
  private moodFolders: MoodFolder[] = [];
  private songsMap: Map<string, Song> = new Map();
  private isInitialized: boolean = false;

  // Private constructor for singleton pattern
  private constructor() {}

  // Get singleton instance
  public static getInstance(): MoodFolderService {
    if (!MoodFolderService.instance) {
      MoodFolderService.instance = new MoodFolderService();
    }
    return MoodFolderService.instance;
  }

  // Initialize the service
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load mood folders from storage
      const foldersJson = await AsyncStorage.getItem(MOOD_FOLDERS_KEY);
      
      if (foldersJson) {
        this.moodFolders = JSON.parse(foldersJson);
      } else {
        // Initialize with default folders if none exist
        this.moodFolders = [...initialMoodFolders];
        await this.saveMoodFolders();
      }

      // Load songs map from storage
      const songsMapJson = await AsyncStorage.getItem(SONGS_MAP_KEY);
      
      if (songsMapJson) {
        const songEntries = JSON.parse(songsMapJson);
        this.songsMap = new Map(songEntries);
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing mood folder service:', error);
    }
  }

  // Save mood folders to storage
  private async saveMoodFolders(): Promise<void> {
    try {
      const foldersJson = JSON.stringify(this.moodFolders);
      await AsyncStorage.setItem(MOOD_FOLDERS_KEY, foldersJson);
    } catch (error) {
      console.error('Error saving mood folders:', error);
    }
  }

  // Save songs map to storage
  private async saveSongsMap(): Promise<void> {
    try {
      const songsMapJson = JSON.stringify(Array.from(this.songsMap.entries()));
      await AsyncStorage.setItem(SONGS_MAP_KEY, songsMapJson);
    } catch (error) {
      console.error('Error saving songs map:', error);
    }
  }

  // Get all mood folders
  public async getMoodFolders(): Promise<MoodFolder[]> {
    await this.initialize();
    return [...this.moodFolders];
  }

  // Get a specific mood folder
  public async getMoodFolder(folderId: string): Promise<MoodFolder | null> {
    await this.initialize();
    const folder = this.moodFolders.find(f => f.id === folderId);
    return folder ? { ...folder } : null;
  }

  // Get folder by mood type
  public async getFolderByMood(mood: MoodType): Promise<MoodFolder | null> {
    await this.initialize();
    const folder = this.moodFolders.find(f => f.mood === mood);
    return folder ? { ...folder } : null;
  }

  // Add a song to a mood folder
  public async addSongToFolder(folderId: string, song: Song): Promise<boolean> {
    await this.initialize();
    
    const folderIndex = this.moodFolders.findIndex(f => f.id === folderId);
    if (folderIndex === -1) return false;
    
    // Add song to the map if it doesn't exist
    if (!this.songsMap.has(song.id)) {
      this.songsMap.set(song.id, { ...song });
      await this.saveSongsMap();
    }
    
    // Check if song is already in folder
    if (this.moodFolders[folderIndex].songs.includes(song.id)) {
      return true; // Song is already in the folder
    }
    
    // Add song to folder
    this.moodFolders[folderIndex].songs.push(song.id);
    await this.saveMoodFolders();
    
    return true;
  }

  // Remove a song from a mood folder
  public async removeSongFromFolder(folderId: string, songId: string): Promise<boolean> {
    await this.initialize();
    
    const folderIndex = this.moodFolders.findIndex(f => f.id === folderId);
    if (folderIndex === -1) return false;
    
    // Check if song is in folder
    const songIndex = this.moodFolders[folderIndex].songs.indexOf(songId);
    if (songIndex === -1) return false;
    
    // Remove song from folder
    this.moodFolders[folderIndex].songs.splice(songIndex, 1);
    await this.saveMoodFolders();
    
    return true;
  }

  // Check if a song exists in a specific folder
  public async isSongInFolder(folderId: string, songId: string): Promise<boolean> {
    await this.initialize();
    
    const folder = this.moodFolders.find(f => f.id === folderId);
    return folder ? folder.songs.includes(songId) : false;
  }

  // Get songs from a specific folder
  public async getSongsFromFolder(folderId: string): Promise<Song[]> {
    await this.initialize();
    
    const folder = this.moodFolders.find(f => f.id === folderId);
    if (!folder) return [];
    
    return folder.songs
      .map(songId => this.songsMap.get(songId))
      .filter((song): song is Song => !!song);
  }

  // Add a song to the appropriate mood folder based on mood
  public async addSongToMoodFolder(song: Song, mood: MoodType): Promise<boolean> {
    await this.initialize();
    
    const folder = this.moodFolders.find(f => f.mood === mood);
    if (!folder) return false;
    
    return this.addSongToFolder(folder.id, song);
  }

  // Get the mood color for a specific mood
  public getMoodColor(mood: MoodType): string {
    const folder = this.moodFolders.find(f => f.mood === mood);
    return folder ? folder.color : '#6200ea'; // Default to app theme color
  }

  // Get the mood icon for a specific mood
  public getMoodIcon(mood: MoodType): string {
    const folder = this.moodFolders.find(f => f.mood === mood);
    return folder ? folder.icon : 'musical-notes-outline'; // Default icon
  }

  // Move a song from one folder to another
  public async moveSongBetweenFolders(
    sourceFolderId: string,
    targetFolderId: string,
    songId: string
  ): Promise<boolean> {
    await this.initialize();
    
    // Remove from source folder
    const removed = await this.removeSongFromFolder(sourceFolderId, songId);
    if (!removed) return false;
    
    // Get song details
    const song = this.songsMap.get(songId);
    if (!song) return false;
    
    // Add to target folder
    return this.addSongToFolder(targetFolderId, song);
  }

  // Update song details in the songs map
  public async updateSongDetails(song: Song): Promise<boolean> {
    await this.initialize();
    
    // Check if song exists
    if (!this.songsMap.has(song.id)) return false;
    
    // Update song
    this.songsMap.set(song.id, { ...song });
    await this.saveSongsMap();
    
    return true;
  }

  // Get all songs from all folders (each song appears once)
  public async getAllSongs(): Promise<Song[]> {
    await this.initialize();
    
    return Array.from(this.songsMap.values());
  }

  // Reset folders to initial state
  public async resetFolders(): Promise<void> {
    this.moodFolders = [...initialMoodFolders];
    await this.saveMoodFolders();
  }
}

export default MoodFolderService;