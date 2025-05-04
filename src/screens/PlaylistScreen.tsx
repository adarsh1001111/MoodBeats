import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import MusicService from '../services/MusicService';
import { Song, Playlist } from '../utils/mockMusicData';

// Define the types for our navigation and route props
type RootStackParamList = {
  Home: undefined;
  MoodPlayer: { mood?: string; songId?: string };
  Playlist: { playlistId?: string; songs?: Song[]; title?: string };
  Settings: undefined;
  FitbitConnect: undefined;
};

type PlaylistScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Playlist'
>;

type PlaylistScreenRouteProp = RouteProp<RootStackParamList, 'Playlist'>;

type Props = {
  navigation: PlaylistScreenNavigationProp;
  route: PlaylistScreenRouteProp;
};

const PlaylistScreen: React.FC<Props> = ({ route, navigation }) => {
  const { playlistId, songs: initialSongs, title: initialTitle } = route.params || {};
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentPlaylist, setCurrentPlaylist] = useState<Playlist | null>(null);
  const [allPlaylists, setAllPlaylists] = useState<Playlist[]>([]);
  const [showAllPlaylists, setShowAllPlaylists] = useState<boolean>(!playlistId);

  useEffect(() => {
    const loadPlaylistData = async () => {
      setIsLoading(true);
      
      try {
        if (playlistId === 'custom' && initialSongs) {
          // Use the provided songs for custom playlists
          setCurrentPlaylist({
            id: 'custom',
            title: initialTitle || 'Custom Playlist',
            songs: initialSongs,
            coverImage: initialSongs[0]?.artwork || 'https://picsum.photos/id/1015/400',
            songCount: initialSongs.length,
          });
          setShowAllPlaylists(false);
        } else if (playlistId) {
          // Load a specific playlist by ID
          const playlist = await MusicService.getPlaylist(playlistId);
          setCurrentPlaylist(playlist);
          setShowAllPlaylists(false);
        } else {
          // Load all playlists
          const playlists = await MusicService.getAllPlaylists();
          setAllPlaylists(playlists);
          setShowAllPlaylists(true);
        }
      } catch (error) {
        console.error('Error loading playlist data:', error);
      }
      
      setIsLoading(false);
    };
    
    loadPlaylistData();
  }, [playlistId, initialSongs, initialTitle]);

  const handlePlayAll = (playlist: Playlist) => {
    if (playlist.songs && playlist.songs.length > 0) {
      navigation.navigate('MoodPlayer', { songId: playlist.songs[0].id });
    }
  };

  const handleSongPress = (song: Song) => {
    navigation.navigate('MoodPlayer', { songId: song.id });
  };

  const renderSongItem = ({ item, index }: { item: Song; index: number }) => (
    <TouchableOpacity 
      style={styles.songItem}
      onPress={() => handleSongPress(item)}
    >
      <Text style={styles.songIndex}>{index + 1}</Text>
      <Image source={{ uri: item.artwork }} style={styles.songArtwork} />
      <View style={styles.songInfo}>
        <Text style={styles.songTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.songArtist} numberOfLines={1}>{item.artist}</Text>
      </View>
      <Ionicons name="ellipsis-vertical" size={24} color="#757575" />
    </TouchableOpacity>
  );

  const renderPlaylistItem = ({ item }: { item: Playlist }) => (
    <TouchableOpacity 
      style={styles.playlistItem}
      onPress={() => navigation.navigate('Playlist', { playlistId: item.id })}
    >
      <Image source={{ uri: item.coverImage }} style={styles.playlistCover} />
      <View style={styles.playlistInfo}>
        <Text style={styles.playlistTitle}>{item.title}</Text>
        <Text style={styles.playlistSongs}>{item.songCount} songs</Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color="#bdbdbd" />
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ea" />
        <Text style={styles.loadingText}>Loading playlists...</Text>
      </View>
    );
  }

  // Render all playlists view
  if (showAllPlaylists) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Your Playlists</Text>
          <TouchableOpacity style={styles.createButton}>
            <Ionicons name="add" size={24} color="#6200ea" />
            <Text style={styles.createText}>Create</Text>
          </TouchableOpacity>
        </View>
        
        <FlatList
          data={allPlaylists}
          keyExtractor={(item) => item.id}
          renderItem={renderPlaylistItem}
          contentContainerStyle={styles.listContainer}
        />
      </View>
    );
  }

  // Render single playlist view
  return (
    <View style={styles.container}>
      {currentPlaylist && (
        <>
          <View style={styles.playlistHeader}>
            <Image 
              source={{ uri: currentPlaylist.coverImage || (currentPlaylist.songs && currentPlaylist.songs.length > 0 ? currentPlaylist.songs[0].artwork : 'https://picsum.photos/id/1015/400') }}
              style={styles.playlistHeaderImage}
            />
            <View style={styles.playlistHeaderOverlay}>
              <Text style={styles.playlistHeaderTitle}>{currentPlaylist.title}</Text>
              <Text style={styles.playlistHeaderSongs}>
                {currentPlaylist.songs ? `${currentPlaylist.songs.length} songs` : '0 songs'}
              </Text>
              
              <TouchableOpacity 
                style={styles.playAllButton}
                onPress={() => handlePlayAll(currentPlaylist)}
                disabled={!currentPlaylist.songs || currentPlaylist.songs.length === 0}
              >
                <Ionicons name="play" size={24} color="#fff" />
                <Text style={styles.playAllText}>Play All</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {currentPlaylist.songs && currentPlaylist.songs.length > 0 ? (
            <FlatList
              data={currentPlaylist.songs}
              keyExtractor={(item) => item.id}
              renderItem={renderSongItem}
              contentContainerStyle={styles.songsListContainer}
            />
          ) : (
            <View style={styles.emptySongsContainer}>
              <Ionicons name="musical-note-off" size={64} color="#e0e0e0" />
              <Text style={styles.emptySongsText}>No songs in this playlist</Text>
            </View>
          )}
        </>
      )}
    </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212121',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  createText: {
    marginLeft: 4,
    color: '#6200ea',
    fontWeight: '500',
    fontSize: 16,
  },
  listContainer: {
    padding: 16,
  },
  playlistItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  playlistCover: {
    width: 60,
    height: 60,
    borderRadius: 4,
  },
  playlistInfo: {
    flex: 1,
    marginLeft: 16,
  },
  playlistTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#212121',
  },
  playlistSongs: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4,
  },
  playlistHeader: {
    height: 200,
    position: 'relative',
  },
  playlistHeaderImage: {
    width: '100%',
    height: '100%',
  },
  playlistHeaderOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 16,
  },
  playlistHeaderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  playlistHeaderSongs: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  playAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6200ea',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  playAllText: {
    color: '#fff',
    marginLeft: 4,
    fontWeight: '500',
  },
  songsListContainer: {
    padding: 16,
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
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
});

export default PlaylistScreen;
