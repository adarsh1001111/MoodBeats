# MoodBeats

MoodBeats is a music player app that recommends songs based on your mood and heart rate data from Fitbit.

## Features

- Connect to your Fitbit device to get heart rate data
- Play music based on your current mood and heart rate
- Create and manage playlists
- Customize settings

## Fitbit Integration

The app uses Fitbit's OAuth 2.0 authentication to access heart rate data. The implementation uses the Implicit Grant Flow, which is recommended by Fitbit for mobile applications.

### Authentication Flow

1. The app opens the Fitbit authentication page in a browser
2. User logs in to their Fitbit account
3. User grants permission to the app
4. Fitbit redirects back to the app with an access token
5. The app stores the token and uses it to fetch heart rate data

### Configuration

The following OAuth 2.0 credentials are used:

- **Client ID**: 23Q9HX
- **Redirect URL**: https://moodmusicapp.netlify.app/
- **Authorization URI**: https://www.fitbit.com/oauth2/authorize
- **Access/Refresh Token Request URI**: https://api.fitbit.com/oauth2/token

## Install and Run

1. Clone the repository
2. Install dependencies: `npm install`
3. Start the app: `npm start`
4. Scan the QR code with the Expo Go app on your device

## Development

The app is built with:

- React Native with Expo
- TypeScript
- React Navigation for routing
- Expo AV for audio playback
- Fitbit API for heart rate data

## Deep Linking

The app supports deep linking for Fitbit OAuth callbacks:

- **URI Scheme**: moodbeats://
- **Web Redirect**: https://moodmusicapp.netlify.app/

## License

MIT