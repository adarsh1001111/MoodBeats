# Setting Up Fitbit OAuth Integration for MoodBeats

This guide will help you properly set up the Fitbit OAuth integration for the MoodBeats app.

## Using the Netlify Redirect Handler

We've configured the app to use the Netlify site you've created (`moodbeats.netlify.app`) as the redirect handler for the Fitbit OAuth process. This is already set up and ready to go.

## Fitbit Developer Portal Settings

Make sure your Fitbit Developer Portal settings match exactly with what's in our code:

1. Go to [Fitbit Developer Portal](https://dev.fitbit.com/)
2. Sign in to your account
3. Go to "Manage My Apps"
4. Find the app with Client ID: `23Q9HX`
5. Click on "Edit Application Settings"
6. Update the following:
   - **OAuth 2.0 Application Type**: Set to "Personal"
   - **Callback URL**: Set to `https://moodbeats.netlify.app/`
     - Make sure there are no typos or extra spaces
     - This must match EXACTLY
   - **Default Access Type**: Select all the scopes needed (heartrate, activity, profile, settings, sleep)
7. Save your changes

## Running the App

1. Run the app with a clean start:
   ```
   npx expo start --clear
   ```

2. Navigate to the Fitbit Connect screen

3. Tap "Sign in with Fitbit"

4. The Fitbit authorization page should open in your browser

5. After authorizing, Fitbit will redirect to your Netlify site, which will then redirect back to your app with the OAuth token

## How It Works

1. When you tap "Sign in with Fitbit," the app opens the Fitbit authorization page
2. After authorizing, Fitbit redirects to your Netlify site (`moodbeats.netlify.app`)
3. The Netlify page extracts the token and redirects back to your app using a deep link
4. The app receives the deep link, extracts the token, and completes the authentication

## Troubleshooting

If you encounter any issues:

1. **Check your logs**: Look at the console logs in your Expo app to see what's happening during the authentication process

2. **Verify the redirect URI**: Make sure the Callback URL in Fitbit Developer Portal is exactly `https://moodbeats.netlify.app/`

3. **Check Netlify deployment**: Make sure the `index.html` file has been properly deployed to your Netlify site

4. **Look for error messages**: The Netlify page includes debug information that might help identify issues

5. **Clear browser cache**: Sometimes clearing your browser's cache can help resolve authentication issues

6. **Try a different browser**: If you're having issues, try using a different browser for the authentication process

## Heart Rate Monitoring

After successful authentication, the app will automatically:

1. Fetch your current heart rate from Fitbit
2. Allow you to enable continuous heart rate monitoring
3. Store heart rate history for use in music recommendations

You can toggle continuous monitoring on/off in the Fitbit Connect screen.
