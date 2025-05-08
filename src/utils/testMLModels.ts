/**
 * Utility to test the ML model integration
 */

// API endpoint for the Flask server
const API_URL = 'http://192.168.29.142:5000/api';

/**
 * Tests the ML models by sending a request with sample heart rate data
 * @returns Promise with the test results
 */
export async function testMLModels() {
  try {
    console.log('Testing ML model integration...');
    
    // First check if the API is available
    const healthResponse = await fetch(`${API_URL}/health`, { method: 'GET' });
    const healthData = await healthResponse.json();
    
    if (!healthResponse.ok) {
      throw new Error(`Health check failed: ${healthResponse.status}`);
    }
    
    console.log('API Health check result:', healthData);
    
    // If health check passes, test the prediction endpoint
    const testRequest = {
      heart_rate: 80, // Sample heart rate
      accelerometer: [
        [0.1, 0.2, 9.8], 
        [0.2, 0.1, 9.7],
        [0.1, 0.3, 9.8]
      ] // Sample accelerometer data
    };
    
    const predictionResponse = await fetch(`${API_URL}/predict-mood`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testRequest),
    });
    
    if (!predictionResponse.ok) {
      throw new Error(`Prediction failed: ${predictionResponse.status}`);
    }
    
    const predictionData = await predictionResponse.json();
    console.log('Test prediction result:', predictionData);
    
    return {
      success: true,
      healthCheck: healthData,
      predictionTest: predictionData
    };
  } catch (error) {
    console.error('ML model test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Checks if the ML server is available
 * @returns Promise<boolean>
 */
export async function isMLServerAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/health`, { method: 'GET' });
    return response.ok;
  } catch (error) {
    return false;
  }
}
