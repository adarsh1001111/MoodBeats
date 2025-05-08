// src/screens/MoodFolderScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Modal,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import MoodFolderService, { MoodFolder, MoodType } from '../services/MoodFolderService';
import EnhancedMusicService from '../services/EnhancedMusicService';
import { Song } from '../utils/mockMusicData';

// Define the types for our navigation and route props
type RootStackParamList = {
  Home: undefined;
  MoodPlayer: { mood?: MoodType; songId?: string };
  Playlist: { playlistId?: string; songs?: any[]; title?: string };
  Settings: undefined;
  FitbitConnect: undefined;
  MoodFolder: { folderId: string };
  AllMoodFolders: undefined;
};

type MoodFolderScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'MoodFolder'
>;

type MoodFolderScreenRouteProp = RouteProp<RootStackParamList, 'MoodFolder'>;

type Props = {
  navigation: MoodFolderScreenNavigationProp;
  route: MoodFolderScreenRouteProp;
};

const MoodFolderScreen: React.FC<Props> = ({ route, navigation }) => {
  const { folderId } = route.params || {};
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentFolder, setCurrentFolder] = useState<MoodFolder | null>(null);
  const [folderSongs, setFolderSongs] = useState<Song[]>([]);
  const [showAddSongsModal, setShowAddSongsModal] = useState<boolean>(false);
  const [availableSongs, setAvailableSongs] = useState<Song[]>([]);
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState<boolean>(false);
  const [songToDelete, setSongToDelete] = useState<string | null>(null);
  
  // Services
  const moodFolderService = MoodFolderService.getInstance();
  const musicService = EnhancedMusicService.getInstance();
  
  // Load folder data
  useEffect(() => {
    const loadFolderData = async () => {
      setIsLoading(true);
      
      try {
        // Initialize services
        await moodFolderService.initialize();
        await musicService.initialize();
        
        // Get folder details
        const folder = await moodFolderService.getMoodFolder(folderId);
        if (!folder) {
          Alert.alert('Error', 'Folder not found');
          navigation.goBack();
          return;
        }
        
        setCurrentFolder(folder);
        
        // Get songs in folder
        const songs = await moodFolderService.getSongsFromFolder(folder.id);
        setFolderSongs(songs);
        
        // Get available songs for adding to folder
        const recentlyPlayed = await musicService.getRecentlyPlayed(20);
        const allSongs = await moodFolderService.getAllSongs();
        
        // Combine songs from both sources, removing duplicates
        const songMap = new Map<string, Song>();
        [...recentlyPlayed, ...allSongs].forEach(song => {
          if (!songMap.has(song.id)) {
            songMap.set(song.id, song);
          }
        });
        
        // Remove songs that are already in the folder
        const folderSongIds = new Set(songs.map(s => s.id));
        const available = Array.from(songMap.values()).filter(
          song => !folderSongIds.has(song.id)
        );
        
        setAvailableSongs(available);
      } catch (error) {
        console.error('Error loading folder data:', error);
        Alert.alert('Error', 'Failed to load folder. Please try again.');
      }
      
      setIsLoading(false);
    };
    
    loadFolderData();
  }, [folderId]);

  // Handle play all songs in folder
  const handlePlayAll = async () => {
    if (!currentFolder || folderSongs.length === 0) return;
    
    try {
      await musicService.playMoodBasedSongs(currentFolder.mood);
      navigation.navigate('MoodPlayer', { mood: currentFolder.mood });
    } catch (error) {
      console.error('Error playing all songs:', error);
      Alert.alert('Error', 'Failed to play songs. Please try again.');
    }
  };

  // Handle playing a specific song
  const handlePlaySong = async (song: Song) => {
    try {
      await musicService.playSong(song.id);
      navigation.navigate('MoodPlayer', { songId: song.id });
    } catch (error) {
      console.error('Error playing song:', error);
      Alert.alert('Error', 'Failed to play song. Please try again.');
    }
  };

  // Handle removing a song from folder
  const confirmRemoveSong = (songId: string) => {
    setSongToDelete(songId);
    setShowConfirmDeleteModal(true);
  };

  // Actually remove the song after confirmation
  const handleRemoveSong = async () => {
    if (!currentFolder || !songToDelete) return;
    
    try {
      const result = await moodFolderService.removeSongFromFolder(
        currentFolder.id,
        songToDelete
      );
      
      if (result) {
        // Update the songs list
        setFolderSongs(folderSongs.filter(s => s.id !== songToDelete));
        
        // Add the removed song to available songs
        const removedSong = folderSongs.find(s => s.id === songToDelete);
        if (removedSong) {
          setAvailableSongs([...availableSongs, removedSong]);
        }
        
        Alert.alert('Success', 'Song removed from folder');
      } else {
        Alert.alert('Error', 'Failed to remove song from folder');
      }
    } catch (error) {
      console.error('Error removing song:', error);
      Alert.alert('Error', 'Failed to remove song from folder');
    }
    
    setSongToDelete(null);
    setShowConfirmDeleteModal(false);
  };

  // Handle adding a song to the folder
  const handleAddSong = async (song: Song) => {
    if (!currentFolder) return;
    
    try {
      const result = await moodFolderService.addSongToFolder(
        currentFolder.id,
        song
      );
      
      if (result) {
        // Update the songs list
        if (!folderSongs.some(s => s.id === song.id)) {
          setFolderSongs([...folderSongs, song]);
        }
        
        // Remove from available songs
        setAvailableSongs(availableSongs.filter(s => s.id !== song.id));
        
        Alert.alert('Success', 'Song added to folder');
      } else {
        Alert.alert('Error', 'Failed to add song to folder');
      }
    } catch (error) {
      console.error('Error adding song:', error);
      Alert.alert('Error', 'Failed to add song to folder');
    }
    
    setShowAddSongsModal(false);
  };

  // Render a song item
  const renderSongItem = ({ item, index }: { item: Song; index: number }) => (
    <View style={styles.songItem}>
      <TouchableOpacity 
        style={styles.songButton}
        onPress={() => handlePlaySong(item)}
      >
        <Text style={styles.songIndex}>{index + 1}</Text>
        <Image source={{ uri: item.artwork }} style={styles.songArtwork} />
        <View style={styles.songInfo}>
          <Text style={styles.songTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.songArtist} numberOfLines={1}>{item.artist}</Text>
        </View>
        <Ionicons name="play-circle-outline" size={32} color="#6200ea" />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.removeButton}
        onPress={() => confirmRemoveSong(item.id)}
      >
        <Ionicons name="trash-outline" size={24} color="#e57373" />
      </TouchableOpacity>
    </View>
  );

  // Render an available song item for the add songs modal
  const renderAvailableSongItem = ({ item }: { item: Song }) => (
    <TouchableOpacity 
      style={styles.availableSongItem}
      onPress={() => handleAddSong(item)}
    >
      <Image source={{ uri: item.artwork }} style={styles.availableSongArtwork} />
      <View style={styles.availableSongInfo}>
        <Text style={styles.availableSongTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.availableSongArtist} numberOfLines={1}>{item.artist}</Text>
      </View>
      <Ionicons name="add-circle-outline" size={24} color="#6200ea" />
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ea" />
        <Text style={styles.loadingText}>Loading folder...</Text>
      </View>
    );
  }

  if (!currentFolder) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#e57373" />
        <Text style={styles.errorText}>Folder not found</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.folderHeader, { backgroundColor: currentFolder.color }]}>
        <View style={styles.folderIcon}>
          <Ionicons name={currentFolder.icon} size={32} color="#fff" />
        </View>
        <View style={styles.folderInfo}>
          <Text style={styles.folderTitle}>{currentFolder.title}</Text>
          <Text style={styles.folderDescription}>{currentFolder.description}</Text>
          <Text style={styles.songCount}>
            {folderSongs.length} {folderSongs.length === 1 ? 'song' : 'songs'}
          </Text>
        </View>
      </View>
      
      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={[styles.actionButton, folderSongs.length === 0 ? styles.disabledButton : null]}
          onPress={handlePlayAll}
          disabled={folderSongs.length === 0}
        >
          <Ionicons name="play" size={18} color="#fff" />
          <Text style={styles.actionButtonText}>Play All</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => setShowAddSongsModal(true)}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.actionButtonText}>Add Songs</Text>
        </TouchableOpacity>
      </View>
      
      {folderSongs.length > 0 ? (
        <FlatList
          data={folderSongs}
          keyExtractor={(item) => item.id}
          renderItem={renderSongItem}
          contentContainerStyle={styles.songsListContainer}
        />
      ) : (
        <View style={styles.emptySongsContainer}>
          <Ionicons name="musical-note-off" size={64} color="#e0e0e0" />
          <Text style={styles.emptySongsText}>No songs in this folder</Text>
          <TouchableOpacity 
            style={styles.addFirstSongButton}
            onPress={() => setShowAddSongsModal(true)}
          >
            <Text style={styles.addFirstSongText}>Add Your First Song</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Add Songs Modal */}
      <Modal
        visible={showAddSongsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddSongsModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Songs to {currentFolder.title}</Text>
              <TouchableOpacity
                onPress={() => setShowAddSongsModal(false)}
              >
                <Ionicons name="close" size={24} color="#424242" />
              </TouchableOpacity>
            </View>
            
            {availableSongs.length > 0 ? (
              <FlatList
                data={availableSongs}
                keyExtractor={(item) => item.id}
                renderItem={renderAvailableSongItem}
                contentContainerStyle={styles.availableSongsList}
              />
            ) : (
              <View style={styles.emptyAvailableSongsContainer}>
                <Ionicons name="search-outline" size={64} color="#e0e0e0" />
                <Text style={styles.emptyAvailableSongsText}>
                  No more songs available to add
                </Text>
                <Text style={styles.emptyAvailableSongsSubtext}>
                  Play more songs to add them here
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
      
      {/* Confirm Delete Modal */}
      <Modal
        visible={showConfirmDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setSongToDelete(null);
          setShowConfirmDeleteModal(false);
        }}
      >
        <View style={styles.confirmModalContainer}>
          <View style={styles.confirmModalContent}>
            <Text style={styles.confirmModalTitle}>Remove Song?</Text>
            <Text style={styles.confirmModalText}>
              Are you sure you want to remove this song from the {currentFolder.title} folder?
            </Text>
            
            <View style={styles.confirmModalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setSongToDelete(null);
                  setShowConfirmDeleteModal(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleRemoveSong}
              >
                <Text style={styles.deleteButtonText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    color: '#424242',
    fontSize: 18,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#6200ea',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginTop: 20,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  folderHeader: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  folderIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  folderInfo: {
    flex: 1,
  },
  folderTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  folderDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  songCount: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 8,
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  actionButton: {
    backgroundColor: '#6200ea',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  disabledButton: {
    backgroundColor: '#bdbdbd',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  songsListContainer: {
    padding: 16,
  },
  songItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  songButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  songIndex: {
    width: 24,
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
  },
  songArtwork: {
    width: 48,
    height: 48,
    borderRadius: 4,
    marginLeft: 8,
  },
  songInfo: {
    flex: 1,
    marginLeft: 16,
    marginRight: 8,
  },
  songTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#212121',
  },
  songArtist: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4,
  },
  removeButton: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5',
    alignItems: 'center',
  },
  emptySongsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptySongsText: {
    fontSize: 18,
    color: '#757575',
    marginTop: 16,
    textAlign: 'center',
  },
  addFirstSongButton: {
    backgroundColor: '#6200ea',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginTop: 20,
  },
  addFirstSongText: {
    color: '#fff',
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
    maxHeight: '80%',
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
  availableSongsList: {
    padding: 16,
  },
  availableSongItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  availableSongArtwork: {
    width: 50,
    height: 50,
    borderRadius: 4,
  },
  availableSongInfo: {
    flex: 1,
    marginLeft: 16,
  },
  availableSongTitle: {
    fontSize: 16,
    color: '#212121',
  },
  availableSongArtist: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4,
  },
  emptyAvailableSongsContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyAvailableSongsText: {
    fontSize: 18,
    color: '#757575',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyAvailableSongsSubtext: {
    fontSize: 14,
    color: '#9e9e9e',
    marginTop: 8,
    textAlign: 'center',
  },
  confirmModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  confirmModalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  confirmModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 12,
  },
  confirmModalText: {
    fontSize: 16,
    color: '#424242',
    marginBottom: 20,
  },
  confirmModalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 12,
  },
  cancelButtonText: {
    color: '#757575',
    fontSize: 16,
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: '#f44336',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default MoodFolderScreen;