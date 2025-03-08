import axios, { AxiosResponse } from 'axios';
import RNFS from 'react-native-fs';

interface UploadResponse {
  success: boolean;
  recordingId: string;
  message: string;
  transcriptionJobId?: string;
}

interface DeviceMetadata {
  platform: string;
  [key: string]: string | number | boolean;
}

interface UploadMetadata {
  deviceInfo: DeviceMetadata;
  [key: string]: any;
}

const API_URL = 'http://your-backend-server.com/api';

export const uploadAudio = async (filePath: string): Promise<UploadResponse> => {
  try {
    // Read file as base64
    const base64Audio = await RNFS.readFile(filePath, 'base64');
    
    // Get filename from path
    const fileName = filePath.split('/').pop() || `recording_${Date.now()}.wav`;
    
    // Upload to server
    const response: AxiosResponse<UploadResponse> = await axios.post(`${API_URL}/audio-upload`, {
      fileName,
      audioData: base64Audio,
      timestamp: new Date().toISOString(),
      metadata: {
        deviceInfo: {
          platform: 'Mobile', 
          // Add more device info as needed
        } as DeviceMetadata
      } as UploadMetadata
    });
    
    console.log('Upload successful:', response.data);
    return response.data;
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
};
