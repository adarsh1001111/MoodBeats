/**
 * Mobile App Bridge Script
 * Helps with token transfer between web and native app
 */

// Set up bridge when document is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Mobile App Bridge loaded');
    setupAppBridge();
});

// Configures mobile app bridge
function setupAppBridge() {
    // Add a hidden iframe for direct token transfer
    const bridgeContainer = document.createElement('div');
    bridgeContainer.id = 'app-bridge-container';
    bridgeContainer.style.position = 'absolute';
    bridgeContainer.style.width = '1px';
    bridgeContainer.style.height = '1px';
    bridgeContainer.style.overflow = 'hidden';
    bridgeContainer.style.opacity = '0.01';
    document.body.appendChild(bridgeContainer);
    
    // Listen for messages from parent window if in iframe
    window.addEventListener('message', function(event) {
        console.log('Received message in bridge:', event.data);
        if (event.data && event.data.type === 'TOKEN_AVAILABLE') {
            sendTokenToApp(event.data.token, event.data.expiry, event.data.userId);
        }
    });
    
    // Check URL for token on load
    window.bridgeSendToken = function(token, expiry, userId) {
        sendTokenToApp(token, expiry, userId);
    };
}

// Attempts to send token to the native app
function sendTokenToApp(token, expiry, userId) {
    console.log('Attempting to send token to app via bridge');
    
    // Try multiple redirection approaches in sequence
    const redirectMethods = [
        // Method 1: Direct auth token in path
        `moodbeats://auth-token/${token}?expires_in=${expiry || '31536000'}&user_id=${userId || ''}`,
        // Method 2: As callback parameter
        `moodbeats://fitbit-callback?access_token=${token}&expires_in=${expiry || '31536000'}&user_id=${userId || ''}`,
        // Method 3: Using hash fragment
        `moodbeats://#access_token=${token}&expires_in=${expiry || '31536000'}&user_id=${userId || ''}`,
        // Method 4: Using URL query parameters
        `moodbeats://?access_token=${token}&expires_in=${expiry || '31536000'}&user_id=${userId || ''}`,
        // Method 5: Specific screen with token
        `moodbeats://fitbit-connect?access_token=${token}&expires_in=${expiry || '31536000'}&user_id=${userId || ''}`
    ];
    
    // Try each method with a slight delay between attempts
    redirectMethods.forEach((url, index) => {
        setTimeout(() => {
            console.log(`Trying redirect method ${index + 1}`);
            
            // First try with iframe to avoid leaving the page
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = url;
            document.body.appendChild(iframe);
            
            // Remove after a short delay
            setTimeout(() => {
                try {
                    document.body.removeChild(iframe);
                } catch (e) {}
            }, 1000);
            
            // For the last attempt, try direct navigation
            if (index === redirectMethods.length - 1) {
                try {
                    console.log('Final attempt: direct URL navigation');
                    window.location.href = url;
                } catch (e) {
                    console.error('Error with direct URL:', e);
                }
            }
        }, index * 700); // Stagger attempts
    });
    
    // Additionally, store the token in localStorage as a fallback
    try {
        localStorage.setItem('moodbeats_fitbit_token', token);
        localStorage.setItem('moodbeats_fitbit_expiry', expiry || '31536000');
        if (userId) localStorage.setItem('moodbeats_fitbit_userid', userId);
        localStorage.setItem('moodbeats_token_timestamp', new Date().getTime().toString());
        console.log('Token saved to localStorage as fallback');
    } catch (e) {
        console.error('Error saving to localStorage:', e);
    }
    
    console.log('Token sending attempts complete');
}

// Expose to window
window.AppBridge = {
    sendToken: sendTokenToApp
};
