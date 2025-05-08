// src/screens/AllMoodFoldersScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import MoodFolderService, { MoodFolder } from '../services/MoodFolderService';

// Define the types for our navigation props
type RootStackParamList = {
  Home: undefined;
  MoodPlayer: { mood?: string; songId?: string };
  Playlist: { playlistId?: string; songs?: any[]; title?: string };
  Settings: undefined;
  FitbitConnect: undefined;
  MoodFolder: { folderId: string };
  AllMoodFolders: undefined;
};

type AllMoodFoldersScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'AllMoodFolders'
>;

type Props = {
  navigation: AllMoodFoldersScreenNavigationProp;
};

const AllMoodFoldersScreen: React.FC<Props> = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [moodFolders, setMoodFolders] = useState<MoodFolder[]>([]);
  
  // Load folders on component mount
  useEffect(() => {
    const loadFolders = async () => {
      setIsLoading(true);
      
      try {
        const moodFolderService = MoodFolderService.getInstance();
        await moodFolderService.initialize();
        
        const folders = await moodFolderService.getMoodFolders();
        setMoodFolders(folders);
      } catch (error) {
        console.error('Error loading mood folders:', error);
      }
      
      setIsLoading(false);
    };
    
    loadFolders();
  }, []);

  // Render a folder item
  const renderFolderItem = ({ item }: { item: MoodFolder }) => (
    <TouchableOpacity 
      style={styles.folderItem}
      onPress={() => navigation.navigate('MoodFolder', { folderId: item.id })}
    >
      <View 
        style={[
          styles.folderIcon, 
          { backgroundColor: item.color }
        ]}
      >
        <Ionicons name={item.icon} size={32} color="#fff" />
      </View>
      
      <View style={styles.folderInfo}>
        <Text style={styles.folderTitle}>{item.title}</Text>
        <Text style={styles.folderDescription}>{item.description}</Text>
      </View>
      
      <Ionicons name="chevron-forward" size={24} color="#bdbdbd" />
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ea" />
        <Text style={styles.loadingText}>Loading mood folders...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mood Folders</Text>
        <Text style={styles.headerSubtitle}>
          Organize your music by mood
        </Text>
      </View>
      
      <FlatList
        data={moodFolders}
        keyExtractor={(item) => item.id}
        renderItem={renderFolderItem}
        contentContainerStyle={styles.folderList}
      />
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Mood folders are automatically created based on your listening habits.
        </Text>
        <TouchableOpacity 
          style={styles.resetButton}
          onPress={async () => {
            const moodFolderService = MoodFolderService.getInstance();
            await moodFolderService.resetFolders();
            const folders = await moodFolderService.getMoodFolders();
            setMoodFolders(folders);
          }}
        >
          <Text style={styles.resetButtonText}>Reset Folders</Text>
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
    padding: 16,
    backgroundColor: '#6200ea',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  folderList: {
    padding: 16,
  },
  folderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  folderIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  folderInfo: {
    flex: 1,
  },
  folderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
  },
  folderDescription: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#9e9e9e',
    textAlign: 'center',
    marginBottom: 16,
  },
  resetButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
  },
  resetButtonText: {
    fontSize: 14,
    color: '#757575',
  },
});

export default AllMoodFoldersScreen;