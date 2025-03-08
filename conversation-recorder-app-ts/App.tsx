import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  Button,
  ActivityIndicator,
} from 'react-native';
import AudioRecorderPlayer, { AudioSet, RecordBackType } from 'react-native-audio-recorder-player';
import RNFS from 'react-native-fs';
import { request, PERMISSIONS, RESULTS, Permission } from 'react-native-permissions';
import ConversationDetector from './src/utils/ConversationDetector';
import { uploadAudio } from './src/api/audioService';

interface AudioFile {
  path: string;
  processed: boolean;
}

const App: React.FC = () => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<string>('00:00:00');
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [status, setStatus] = useState<string>('Idle');
  
  const audioRecorderPlayer = new AudioRecorderPlayer();
  const conversationDetector = new ConversationDetector();
  
  useEffect(() => {
    requestPermissions();
    return () => {
      if (isRecording) {
        stopRecording();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const requestPermissions = async (): Promise<void> => {
    try {
      const permissions: Permission[] = [
        PERMISSIONS.ANDROID.RECORD_AUDIO,
        PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE,
        PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE
      ];
      
      for (const permission of permissions) {
        const result = await request(permission);
        if (result !== RESULTS.GRANTED) {
          console.warn(`Permission not granted: ${permission}`);
        }
      }
    } catch (err) {
      console.warn('Error requesting permissions:', err);
    }
  };
  
  const startRecording = async (): Promise<void> => {
    setIsRecording(true);
    setStatus('Recording started');
    
    // Start continuous recording with segments
    await startContinuousRecording();
  };
  
  const startContinuousRecording = async (): Promise<void> => {
    try {
      const audioPath = `${RNFS.CachesDirectoryPath}/recording_${Date.now()}.wav`;
      
      // Audio recording options
      const audioSet: AudioSet = {
        AudioEncoderAndroid: 'AAC',
        AudioSourceAndroid: 'MIC',
        AVEncoderAudioQualityKeyIOS: 'high',
        AVNumberOfChannelsKeyIOS: 2,
        AVFormatIDKeyIOS: 'aac',
      };
      
      await audioRecorderPlayer.startRecorder(audioPath, audioSet);
      audioRecorderPlayer.addRecordBackListener((e: RecordBackType) => {
        setRecordingTime(audioRecorderPlayer.mmssss(Math.floor(e.currentPosition)));
        
        // Every 30 seconds, create a new segment
        if (e.currentPosition > 30000 && e.currentPosition % 30000 < 100) {
          createNewSegment();
        }
      });
      
      setAudioFiles(prev => [...prev, { path: audioPath, processed: false }]);
    } catch (err) {
      console.error('Failed to start recording', err);
      setStatus(`Recording failed to start: ${err instanceof Error ? err.message : String(err)}`);
      setIsRecording(false);
    }
  };
  
  const createNewSegment = async (): Promise<void> => {
    try {
      // Stop current recording
      const result = await audioRecorderPlayer.stopRecorder();
      audioRecorderPlayer.removeRecordBackListener();
      
      // Process the just-finished recording
      await processAudioSegment(result);
      
      // Start a new recording segment
      if (isRecording) {
        await startContinuousRecording();
      }
    } catch (err) {
      console.error('Failed to create new segment', err);
    }
  };
  
  const processAudioSegment = async (filePath: string): Promise<void> => {
    try {
      setIsProcessing(true);
      setStatus('Processing audio segment...');
      
      // Use on-device ML to detect if segment has conversation
      const hasConversation = await conversationDetector.detectConversation(filePath);
      
      if (hasConversation) {
        setStatus('Conversation detected! Uploading...');
        // Upload to server
        await uploadAudio(filePath);
        setStatus('Uploaded successfully!');
      } else {
        // Delete the non-conversation audio
        await RNFS.unlink(filePath);
        setStatus('No conversation detected. Segment deleted.');
      }
    } catch (err) {
      console.error('Failed to process segment', err);
      setStatus(`Processing failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const stopRecording = async (): Promise<void> => {
    if (!isRecording) return;
    
    try {
      const result = await audioRecorderPlayer.stopRecorder();
      audioRecorderPlayer.removeRecordBackListener();
      
      // Process the final segment
      await processAudioSegment(result);
      
      setIsRecording(false);
      setStatus('Recording stopped');
    } catch (err) {
      console.error('Failed to stop recording', err);
      setStatus(`Failed to stop recording: ${err instanceof Error ? err.message : String(err)}`);
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.content}>
        <Text style={styles.title}>Conversation Recorder</Text>
        
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>Status: {status}</Text>
          {isProcessing && <ActivityIndicator size="small" color="#0000ff" />}
        </View>
        
        <Text style={styles.timeText}>{recordingTime}</Text>
        
        <View style={styles.buttonContainer}>
          {isRecording ? (
            <Button title="Stop Recording" onPress={stopRecording} color="red" />
          ) : (
            <Button title="Start Recording" onPress={startRecording} color="green" />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusText: {
    fontSize: 16,
    marginRight: 10,
  },
  timeText: {
    fontSize: 48,
    fontWeight: '200',
    marginBottom: 30,
  },
  buttonContainer: {
    width: '100%',
    paddingHorizontal: 50,
  },
});

export default App;
