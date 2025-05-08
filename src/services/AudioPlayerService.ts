// src/services/AudioPlayerService.ts
import { Audio } from 'expo-av';
import { AVPlaybackStatus, Sound } from 'expo-av/build/Audio';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Event types for player state changes
export type PlayerEvent = 'play' | 'pause' | 'stop' | 'end' | 'loading' | 'timeupdate' | 'error';

// Listener function type
type PlayerEventListener = (data?: any) => void;

// Structure to store listeners
interface EventListeners {
  [event: string]: PlayerEventListener[];
}

class AudioPlayerService {
  private static instance: AudioPlayerService;
  private sound: Sound | null = null;
  private isPlaying: boolean = false;
  private isPaused: boolean = false;
  private currentSongId: string | null = null;
  private listeners: EventListeners = {};
  private playbackPosition: number = 0;
  private duration: number = 0;
  private updateInterval: NodeJS.Timeout | null = null;
  private _isInitialized: boolean = false;
  private queue: string[] = [];
  private currentQueueIndex: number = -1;
  private simulationMode: boolean = true; // Added for mock playback

  // Private constructor for singleton pattern
  private constructor() {
    this.initializeAudio();
  }

  // Get singleton instance
  public static getInstance(): AudioPlayerService {
    if (!AudioPlayerService.instance) {
      AudioPlayerService.instance = new AudioPlayerService();
    }
    return AudioPlayerService.instance;
  }

  // Initialize audio system
  private async initializeAudio(): Promise<void> {
    if (this._isInitialized) return;

    try {
      // Configure audio mode
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Try to restore previous player state
      await this.restorePlayerState();

      this._isInitialized = true;
    } catch (error) {
      console.error('Error initializing audio player:', error);
      this.emitEvent('error', { error: 'Failed to initialize audio player' });
    }
  }

  // Save current player state
  private async savePlayerState(): Promise<void> {
    try {
      const playerState = {
        currentSongId: this.currentSongId,
        queue: this.queue,
        currentQueueIndex: this.currentQueueIndex,
        playbackPosition: this.playbackPosition,
      };
      await AsyncStorage.setItem('playerState', JSON.stringify(playerState));
    } catch (error) {
      console.error('Error saving player state:', error);
    }
  }

  // Restore previous player state
  private async restorePlayerState(): Promise<void> {
    try {
      const playerStateJson = await AsyncStorage.getItem('playerState');
      if (playerStateJson) {
        const playerState = JSON.parse(playerStateJson);
        this.queue = playerState.queue || [];
        this.currentQueueIndex = playerState.currentQueueIndex || -1;
        
        // We don't automatically start playback here, just restore the state
        if (playerState.currentSongId) {
          this.currentSongId = playerState.currentSongId;
          this.playbackPosition = playerState.playbackPosition || 0;
        }
      }
    } catch (error) {
      console.error('Error restoring player state:', error);
    }
  }

  // Add an event listener
  public addEventListener(event: PlayerEvent, callback: PlayerEventListener): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  // Remove an event listener
  public removeEventListener(event: PlayerEvent, callback: PlayerEventListener): void {
    if (!this.listeners[event]) return;
    
    this.listeners[event] = this.listeners[event].filter(
      listener => listener !== callback
    );
  }

  // Emit an event to all listeners
  private emitEvent(event: PlayerEvent, data?: any): void {
    if (!this.listeners[event]) return;
    
    this.listeners[event].forEach(callback => {
      callback(data);
    });
  }

  // Load a song into the player
  public async loadSong(songId: string, audioUrl: string, position: number = 0): Promise<boolean> {
    try {
      this.emitEvent('loading', { songId });
      
      // Unload any existing sound
      if (this.sound) {
        await this.sound.unloadAsync();
        this.sound = null;
      }
      
      this.isPlaying = false;
      this.isPaused = false;
      this.currentSongId = songId;
      this.playbackPosition = position;
      
      // If in simulation mode, we don't actually load audio
      if (this.simulationMode) {
        // Set a default duration for our simulated playback
        this.duration = 180; // 3 minutes
        
        // Start the time update interval
        this.startTimeUpdateInterval();
        await this.savePlayerState();
        return true;
      }
      
      // Try to create the sound object
      try {
        const { sound } = await Audio.Sound.createAsync(
          { uri: audioUrl },
          { positionMillis: position * 1000, shouldPlay: false },
          this.onPlaybackStatusUpdate
        );
        
        this.sound = sound;
      } catch (error) {
        console.error('Error loading song:', error);
        // Fall back to simulation mode if loading fails
        this.simulationMode = true;
        this.duration = 180; // 3 minutes
      }
      
      // Start the time update interval
      this.startTimeUpdateInterval();
      
      await this.savePlayerState();
      return true;
    } catch (error) {
      console.error('Error loading song:', error);
      this.emitEvent('error', { error: 'Failed to load song', details: error });
      return false;
    }
  }

  // Handle playback status updates
  private onPlaybackStatusUpdate = (status: AVPlaybackStatus): void => {
    if (!status.isLoaded) {
      if (status.error) {
        console.error('Error in playback:', status.error);
        this.emitEvent('error', { error: status.error });
        
        // Switch to simulation mode on error
        this.simulationMode = true;
      }
      return;
    }
    
    // Update duration and position
    this.duration = status.durationMillis ? status.durationMillis / 1000 : 0;
    this.playbackPosition = status.positionMillis ? status.positionMillis / 1000 : 0;
    
    // Handle playback end
    if (status.didJustFinish && !status.isLooping) {
      this.isPlaying = false;
      this.playbackPosition = 0;
      this.emitEvent('end');
      
      // Auto-advance to next song if in queue
      this.playNext();
    }
  };

  // Start the timer for position updates
  private startTimeUpdateInterval(): void {
    // Clear any existing interval
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    // Set up a new interval
    this.updateInterval = setInterval(() => {
      if (this.isPlaying) {
        // In simulation mode, manually increment position
        if (this.simulationMode) {
          this.playbackPosition += 0.5; // Update every half second
          
          // Check if we've reached the end
          if (this.playbackPosition >= this.duration) {
            this.isPlaying = false;
            this.playbackPosition = 0;
            this.emitEvent('end');
            this.playNext();
            return;
          }
        }
        
        this.emitEvent('timeupdate', {
          position: this.playbackPosition,
          duration: this.duration
        });
      }
    }, 500); // Update twice per second
  }

  // Play the current song
  public async play(): Promise<boolean> {
    if (this.simulationMode) {
      this.isPlaying = true;
      this.isPaused = false;
      this.emitEvent('play');
      return true;
    }
    
    if (!this.sound) return false;
    
    try {
      await this.sound.playAsync();
      this.isPlaying = true;
      this.isPaused = false;
      this.emitEvent('play');
      return true;
    } catch (error) {
      console.error('Error playing song:', error);
      this.emitEvent('error', { error: 'Failed to play song' });
      
      // Fall back to simulation
      this.simulationMode = true;
      this.isPlaying = true;
      this.isPaused = false;
      this.emitEvent('play');
      return true;
    }
  }

  // Pause the current song
  public async pause(): Promise<boolean> {
    if (this.simulationMode) {
      this.isPlaying = false;
      this.isPaused = true;
      this.emitEvent('pause');
      return true;
    }
    
    if (!this.sound || !this.isPlaying) return false;
    
    try {
      await this.sound.pauseAsync();
      this.isPlaying = false;
      this.isPaused = true;
      this.emitEvent('pause');
      return true;
    } catch (error) {
      console.error('Error pausing song:', error);
      this.emitEvent('error', { error: 'Failed to pause song' });
      
      // Fall back to simulation
      this.simulationMode = true;
      this.isPlaying = false;
      this.isPaused = true;
      this.emitEvent('pause');
      return true;
    }
  }

  // Stop playback completely
  public async stop(): Promise<boolean> {
    if (this.simulationMode) {
      this.isPlaying = false;
      this.isPaused = false;
      this.playbackPosition = 0;
      this.emitEvent('stop');
      return true;
    }
    
    if (!this.sound) return false;
    
    try {
      await this.sound.stopAsync();
      this.isPlaying = false;
      this.isPaused = false;
      this.playbackPosition = 0;
      this.emitEvent('stop');
      return true;
    } catch (error) {
      console.error('Error stopping song:', error);
      this.emitEvent('error', { error: 'Failed to stop song' });
      
      // Fall back to simulation
      this.simulationMode = true;
      this.isPlaying = false;
      this.isPaused = false;
      this.playbackPosition = 0;
      this.emitEvent('stop');
      return true;
    }
  }

  // Seek to a specific position in the song
  public async seekTo(position: number): Promise<boolean> {
    if (this.simulationMode) {
      this.playbackPosition = position;
      this.emitEvent('timeupdate', {
        position: this.playbackPosition,
        duration: this.duration
      });
      return true;
    }
    
    if (!this.sound) return false;
    
    try {
      await this.sound.setPositionAsync(position * 1000);
      this.playbackPosition = position;
      this.emitEvent('timeupdate', {
        position: this.playbackPosition,
        duration: this.duration
      });
      return true;
    } catch (error) {
      console.error('Error seeking:', error);
      this.emitEvent('error', { error: 'Failed to seek' });
      
      // Fall back to simulation
      this.simulationMode = true;
      this.playbackPosition = position;
      this.emitEvent('timeupdate', {
        position: this.playbackPosition,
        duration: this.duration
      });
      return true;
    }
  }

  // Get current playback status
  public getStatus(): { 
    isPlaying: boolean; 
    isPaused: boolean; 
    position: number; 
    duration: number;
    currentSongId: string | null;
    currentQueueIndex: number;
    queueLength: number;
    inSimulationMode: boolean;
  } {
    return {
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      position: this.playbackPosition,
      duration: this.duration,
      currentSongId: this.currentSongId,
      currentQueueIndex: this.currentQueueIndex,
      queueLength: this.queue.length,
      inSimulationMode: this.simulationMode
    };
  }

  // Set a new queue of songs
  public setQueue(songIds: string[], startIndex: number = 0): void {
    this.queue = [...songIds];
    this.currentQueueIndex = startIndex >= 0 && startIndex < songIds.length ? startIndex : 0;
    this.savePlayerState();
  }

  // Add a song to the queue
  public addToQueue(songId: string): void {
    this.queue.push(songId);
    this.savePlayerState();
  }

  // Remove a song from the queue
  public removeFromQueue(index: number): boolean {
    if (index < 0 || index >= this.queue.length) return false;
    
    // If removing current song, stop playback
    if (index === this.currentQueueIndex && this.isPlaying) {
      this.stop();
    }
    
    // Remove the song
    this.queue.splice(index, 1);
    
    // Adjust current index if needed
    if (index < this.currentQueueIndex) {
      this.currentQueueIndex--;
    } else if (index === this.currentQueueIndex) {
      // If we removed the current song and it was the last one, go to previous
      if (this.currentQueueIndex >= this.queue.length) {
        this.currentQueueIndex = Math.max(0, this.queue.length - 1);
      }
    }
    
    this.savePlayerState();
    return true;
  }

  // Get the current queue
  public getQueue(): string[] {
    return [...this.queue];
  }

  // Play next song in queue
  public async playNext(): Promise<boolean> {
    if (this.queue.length === 0) return false;
    
    // Move to next song in queue
    this.currentQueueIndex = (this.currentQueueIndex + 1) % this.queue.length;
    const nextSongId = this.queue[this.currentQueueIndex];
    
    // Emit an event so UI can load the song details
    this.emitEvent('loading', { songId: nextSongId, isAutoAdvance: true });
    
    this.savePlayerState();
    return true;
  }

  // Play previous song in queue
  public async playPrevious(): Promise<boolean> {
    if (this.queue.length === 0) return false;
    
    // If we're more than 3 seconds into the song, restart it instead of going to previous
    if (this.playbackPosition > 3) {
      this.seekTo(0);
      return true;
    }
    
    // Move to previous song in queue
    this.currentQueueIndex = (this.currentQueueIndex - 1 + this.queue.length) % this.queue.length;
    const prevSongId = this.queue[this.currentQueueIndex];
    
    // Emit an event so UI can load the song details
    this.emitEvent('loading', { songId: prevSongId, isAutoAdvance: true });
    
    this.savePlayerState();
    return true;
  }

  // Set simulation mode (for testing or when real audio isn't available)
  public setSimulationMode(enabled: boolean): void {
    this.simulationMode = enabled;
  }

  // Clean up resources
  public async cleanup(): Promise<void> {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    if (this.sound) {
      try {
        await this.sound.unloadAsync();
        this.sound = null;
      } catch (error) {
        console.error('Error cleaning up sound:', error);
      }
    }
    
    this.isPlaying = false;
    this.isPaused = false;
    await this.savePlayerState();
  }
}

export default AudioPlayerService;