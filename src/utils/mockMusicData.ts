// Mock data for the MoodBeats app
// This file provides sample data for testing and development

/**
 * Mock songs collection
 */
export interface Song {
  id: string;
  title: string;
  artist: string;
  album?: string;
  artwork: string;
  audioUrl?: string;
  duration: number;
  genre?: string;
}

export interface Playlist {
  id: string;
  title: string;
  description?: string;
  coverImage: string;
  category?: string;
  songCount: number;
  songs?: Song[];
}

export const mockSongs: Song[] = [
  {
    id: 'song1',
    title: 'Calm Waves',
    artist: 'Ocean Sounds',
    album: 'Natural Healing',
    artwork: 'https://picsum.photos/id/1025/400',
    audioUrl: 'https://example.com/tracks/calm_waves.mp3',
    duration: 240,
    genre: 'Ambient',
  },
  {
    id: 'song2',
    title: 'Energy Boost',
    artist: 'Workout Mix',
    album: 'Fitness Beats',
    artwork: 'https://picsum.photos/id/1035/400',
    audioUrl: 'https://example.com/tracks/energy_boost.mp3',
    duration: 195,
    genre: 'Electronic',
  },
  {
    id: 'song3',
    title: 'Happy Days',
    artist: 'Sunshine Band',
    album: 'Summer Vibes',
    artwork: 'https://picsum.photos/id/1036/400',
    audioUrl: 'https://example.com/tracks/happy_days.mp3',
    duration: 180,
    genre: 'Pop',
  },
  {
    id: 'song4',
    title: 'Deep Focus',
    artist: 'Study Mix',
    album: 'Concentration',
    artwork: 'https://picsum.photos/id/1040/400',
    audioUrl: 'https://example.com/tracks/deep_focus.mp3',
    duration: 320,
    genre: 'Classical',
  },
  {
    id: 'song5',
    title: 'Evening Relaxation',
    artist: 'Peaceful Mind',
    album: 'Sleep Well',
    artwork: 'https://picsum.photos/id/1050/400',
    audioUrl: 'https://example.com/tracks/evening_relaxation.mp3',
    duration: 360,
    genre: 'Ambient',
  },
  {
    id: 'song6',
    title: 'Morning Run',
    artist: 'Active Life',
    album: 'Cardio Beats',
    artwork: 'https://picsum.photos/id/1060/400',
    audioUrl: 'https://example.com/tracks/morning_run.mp3',
    duration: 210,
    genre: 'Electronic',
  },
  {
    id: 'song7',
    title: 'Joyful Moments',
    artist: 'Positive Vibes',
    album: 'Good Times',
    artwork: 'https://picsum.photos/id/1069/400',
    audioUrl: 'https://example.com/tracks/joyful_moments.mp3',
    duration: 190,
    genre: 'Pop',
  },
  {
    id: 'song8',
    title: 'Concentration',
    artist: 'Mind Focus',
    album: 'Deep Work',
    artwork: 'https://picsum.photos/id/1073/400',
    audioUrl: 'https://example.com/tracks/concentration.mp3',
    duration: 340,
    genre: 'Instrumental',
  },
  {
    id: 'song9',
    title: 'Sunset Chill',
    artist: 'Beach Vibes',
    album: 'Coastal Beats',
    artwork: 'https://picsum.photos/id/1080/400',
    audioUrl: 'https://example.com/tracks/sunset_chill.mp3',
    duration: 280,
    genre: 'Chill',
  },
  {
    id: 'song10',
    title: 'Motivation',
    artist: 'Success Mindset',
    album: 'Achieve Goals',
    artwork: 'https://picsum.photos/id/1082/400',
    audioUrl: 'https://example.com/tracks/motivation.mp3',
    duration: 220,
    genre: 'Electronic',
  },
];

/**
 * Mock playlists collection
 */
export const mockPlaylists: Playlist[] = [
  {
    id: 'playlist1',
    title: 'Relaxation Mix',
    description: 'Calm down and unwind with these relaxing tracks',
    coverImage: 'https://picsum.photos/id/1015/400',
    category: 'mood',
    songCount: 15,
  },
  {
    id: 'playlist2',
    title: 'Workout Boost',
    description: 'High energy beats to power your fitness routine',
    coverImage: 'https://picsum.photos/id/1033/400',
    category: 'mood',
    songCount: 18,
  },
  {
    id: 'playlist3',
    title: 'Happy Vibes',
    description: 'Feel-good music to brighten your day',
    coverImage: 'https://picsum.photos/id/1035/400',
    category: 'mood',
    songCount: 12,
  },
  {
    id: 'playlist4',
    title: 'Focus Time',
    description: 'Concentration enhancing music for deep work sessions',
    coverImage: 'https://picsum.photos/id/1042/400',
    category: 'mood',
    songCount: 10,
  },
];

/**
 * Mock mood-based song recommendations
 */
export const mockMoodRecommendations: Record<string, Song[]> = {
  'Happy': [
    mockSongs[2],  // Happy Days
    mockSongs[6],  // Joyful Moments
  ],
  'Sad': [
    mockSongs[0],  // Calm Waves
    mockSongs[4],  // Evening Relaxation
    mockSongs[8],  // Sunset Chill
  ],
  'Energetic': [
    mockSongs[1],  // Energy Boost
    mockSongs[5],  // Morning Run
    mockSongs[9],  // Motivation
  ],
  'Calm': [
    mockSongs[0],  // Calm Waves
    mockSongs[4],  // Evening Relaxation
  ],
  'Focused': [
    mockSongs[3],  // Deep Focus
    mockSongs[7],  // Concentration
  ],
  'Relaxed': [
    mockSongs[0],  // Calm Waves
    mockSongs[4],  // Evening Relaxation
    mockSongs[8],  // Sunset Chill
  ],
};
