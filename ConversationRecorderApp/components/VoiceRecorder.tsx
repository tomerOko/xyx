import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Audio } from "expo-av";
import axios from "axios";
import { check, request, PERMISSIONS, RESULTS } from "react-native-permissions";
import * as FileSystem from "expo-file-system";

// Server URL - replace with your actual server URL
const SERVER_URL = "http://localhost:3000/api/audio/audio-upload";

const VoiceRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState("00:00:00");
  const [isUploading, setIsUploading] = useState(false);
  const [recordingPath, setRecordingPath] = useState("");
  const [hasPermission, setHasPermission] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);

  // Timer ref for tracking recording duration
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check for microphone permissions
    checkPermission();

    // Set up audio
    setupAudio();

    return () => {
      // Clean up
      if (isRecording && recording) {
        stopRecording();
      }

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Add a separate effect to request permissions on mount
  useEffect(() => {
    const requestInitialPermissions = async () => {
      try {
        console.log("Requesting initial permissions...");
        // Try Expo Audio permissions first
        const { status } = await Audio.requestPermissionsAsync();
        console.log("Initial Expo Audio permission status:", status);

        if (status === "granted") {
          setHasPermission(true);
        } else {
          // If Expo permissions fail, try react-native-permissions
          await checkPermission();
        }
      } catch (error) {
        console.error("Error requesting initial permissions:", error);
      }
    };

    requestInitialPermissions();
  }, []);

  const setupAudio = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });
      console.log("Audio mode set up successfully");
    } catch (error) {
      console.error("Failed to set up audio mode", error);
    }
  };

  const checkPermission = async () => {
    try {
      const micPermission =
        Platform.OS === "ios"
          ? PERMISSIONS.IOS.MICROPHONE
          : PERMISSIONS.ANDROID.RECORD_AUDIO;

      console.log("Checking permission for:", micPermission);
      const result = await check(micPermission);
      console.log("Permission check result:", result);

      if (result === RESULTS.GRANTED) {
        console.log("Permission already granted");
        setHasPermission(true);
        return true;
      } else if (
        result === RESULTS.DENIED ||
        result === RESULTS.BLOCKED ||
        result === RESULTS.UNAVAILABLE
      ) {
        console.log("Permission not granted, requesting...");

        // Force a new permission request
        const requestResult = await request(micPermission);
        console.log("Permission request result:", requestResult);

        if (requestResult === RESULTS.GRANTED) {
          console.log("Permission granted after request");
          setHasPermission(true);
          return true;
        } else {
          console.log("Permission denied after request:", requestResult);

          // If permission is blocked, guide the user to settings
          if (requestResult === RESULTS.BLOCKED) {
            Alert.alert(
              "Permission Required",
              "Microphone permission is required but has been blocked. Please enable it in your device settings.",
              [{ text: "Cancel", style: "cancel" }, { text: "OK" }]
            );
          } else {
            Alert.alert(
              "Permission Required",
              "Microphone permission is required to record audio.",
              [{ text: "OK" }]
            );
          }
          return false;
        }
      } else {
        console.log("Permission check other result:", result);
        Alert.alert(
          "Permission Required",
          "Microphone permission is required to record audio.",
          [{ text: "OK" }]
        );
        return false;
      }
    } catch (error) {
      console.error("Error checking microphone permission:", error);
      return false;
    }
  };

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const startRecording = async () => {
    console.log("Start recording button clicked");

    try {
      console.log("Requesting audio permissions...");
      // Request permissions directly from Expo Audio first
      const { status } = await Audio.requestPermissionsAsync();
      console.log("Expo Audio permission status:", status);

      if (status !== "granted") {
        // If Expo Audio permission is not granted, try using react-native-permissions
        console.log(
          "Expo Audio permission not granted, trying react-native-permissions..."
        );
        const permissionGranted = await checkPermission();

        if (!permissionGranted) {
          console.log("Permission denied through both methods");
          Alert.alert(
            "Permission Denied",
            "Microphone permission is required to record audio. Please enable it in your device settings."
          );
          return;
        }
      } else {
        // Update our state if permission was granted through Expo
        setHasPermission(true);
      }

      console.log("Starting recording process...");
      // Generate a unique filename with timestamp
      const timestamp = new Date().getTime();
      const fileName = `recording_${timestamp}.wav`;

      // Create recording object
      console.log("Creating new recording...");
      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      // Start recording
      await newRecording.startAsync();
      setRecording(newRecording);
      setIsRecording(true);

      // Get the URI of the recording
      const uri = newRecording.getURI();
      if (uri) {
        setRecordingPath(uri);
        console.log("Recording started at path:", uri);
      }

      // Start timer to track recording duration
      let duration = 0;
      timerRef.current = setInterval(() => {
        duration += 100;
        setRecordingDuration(duration);
        setRecordTime(formatTime(duration));
      }, 100);
    } catch (error: any) {
      console.error("Failed to start recording", error);
      Alert.alert("Error", "Failed to start recording: " + error.message);
    }
  };

  const stopRecording = async () => {
    console.log("Stop recording button clicked");

    if (!recording) {
      console.error("No active recording");
      Alert.alert("Error", "No active recording found");
      return;
    }

    try {
      // Stop the timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Stop recording
      console.log("Stopping recorder...");
      await recording.stopAndUnloadAsync();

      const uri = recording.getURI();
      console.log("Recording stopped, URI:", uri);

      setIsRecording(false);
      setRecording(null);

      // Upload the recording if we have a valid URI
      if (uri) {
        console.log("Starting upload process with path:", uri);
        uploadRecording(uri);
      } else {
        Alert.alert("Error", "Failed to get recording URI");
      }
    } catch (error: any) {
      console.error("Failed to stop recording", error);
      Alert.alert("Error", "Failed to stop recording: " + error.message);
    }
  };

  const uploadRecording = async (filePath: string) => {
    try {
      setIsUploading(true);
      console.log("Reading file from path:", filePath);

      // Check if running on web
      if (Platform.OS === "web") {
        console.log("Running on web platform, using web-specific approach");

        // For web, we need to handle the recording differently
        // The URI from recording.getURI() on web is already a blob URL
        try {
          // On web, we can fetch the blob directly from the URI
          const response = await fetch(filePath);
          const blob = await response.blob();

          // Create a FormData object to send the file
          const formData = new FormData();
          formData.append(
            "audioFile",
            blob,
            `recording_${new Date().getTime()}.wav`
          );
          formData.append("timestamp", new Date().toISOString());
          formData.append("platform", "web");

          // Send to server
          console.log("Sending to server using FormData:", SERVER_URL);
          const serverResponse = await axios.post(SERVER_URL, formData, {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          });

          console.log("Upload successful", serverResponse.data);
          Alert.alert("Success", "Recording uploaded successfully");
        } catch (webError: any) {
          console.error("Web-specific upload error:", webError);
          throw webError;
        }
      } else {
        // Native platform approach (iOS/Android)
        // Check if file exists
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        console.log("File info:", fileInfo);

        if (!fileInfo.exists) {
          throw new Error("Recording file not found");
        }

        // Read the file as base64
        console.log("Reading file as base64...");
        const base64Data = await FileSystem.readAsStringAsync(filePath, {
          encoding: FileSystem.EncodingType.Base64,
        });
        console.log(
          "File read successfully, base64 length:",
          base64Data.length
        );

        // Prepare the request payload
        const payload = {
          fileName: `recording_${new Date().getTime()}.wav`,
          audioData: base64Data,
          timestamp: new Date().toISOString(),
          metadata: {
            deviceInfo: {
              platform: Platform.OS,
              version: Platform.Version,
            },
          },
        };

        // Send to server
        console.log("Sending to server:", SERVER_URL);
        const response = await axios.post(SERVER_URL, payload);

        console.log("Upload successful", response.data);
        Alert.alert("Success", "Recording uploaded successfully");

        // Clean up the file
        await FileSystem.deleteAsync(filePath);
      }
    } catch (error: any) {
      console.error("Failed to upload recording", error);
      Alert.alert("Error", "Failed to upload recording: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Voice Recorder</Text>

      {!hasPermission && (
        <TouchableOpacity
          style={[styles.button, styles.permissionButton]}
          onPress={async () => {
            console.log("Permission button pressed");
            // Try both permission methods
            const expoResult = await Audio.requestPermissionsAsync();
            console.log("Expo permission request result:", expoResult);

            if (expoResult.status === "granted") {
              setHasPermission(true);
            } else {
              await checkPermission();
            }
          }}
        >
          <Text style={styles.buttonText}>Grant Microphone Permission</Text>
        </TouchableOpacity>
      )}

      {isRecording ? (
        <View style={styles.recordingContainer}>
          <Text style={styles.recordingTime}>{recordTime}</Text>
          <TouchableOpacity
            style={[styles.button, styles.stopButton]}
            onPress={stopRecording}
            disabled={isUploading}
          >
            <Text style={styles.buttonText}>Stop Recording</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.button, styles.recordButton]}
          onPress={startRecording}
          disabled={isUploading}
        >
          <Text style={styles.buttonText}>Record</Text>
        </TouchableOpacity>
      )}

      {isUploading && (
        <View style={styles.uploadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={styles.uploadingText}>Uploading recording...</Text>
        </View>
      )}

      {/* Debug button */}
      <TouchableOpacity
        style={[styles.button, styles.debugButton]}
        onPress={async () => {
          console.log("Debug button pressed");
          console.log("hasPermission:", hasPermission);
          console.log("isRecording:", isRecording);
          console.log("recordingPath:", recordingPath);
          console.log("audioRecorderPlayer initialized:", !!recording);

          // Check current permission status
          let expoStatus = "Unknown";
          let rnpStatus = "Unknown";

          try {
            const { status } = await Audio.getPermissionsAsync();
            expoStatus = status;

            const micPermission =
              Platform.OS === "ios"
                ? PERMISSIONS.IOS.MICROPHONE
                : PERMISSIONS.ANDROID.RECORD_AUDIO;
            rnpStatus = await check(micPermission);
          } catch (error) {
            console.error("Error checking permissions in debug:", error);
          }

          Alert.alert(
            "Debug Info",
            `Permission State: ${hasPermission ? "Granted" : "Not Granted"}\n` +
              `Expo Permission: ${expoStatus}\n` +
              `RNP Permission: ${rnpStatus}\n` +
              `Recording: ${isRecording ? "Yes" : "No"}\n` +
              `Path: ${recordingPath || "None"}\n` +
              `Recorder: ${recording ? "Initialized" : "Not Initialized"}`
          );

          // Try requesting permissions again
          const result = await Audio.requestPermissionsAsync();
          console.log("Debug permission request result:", result);
        }}
      >
        <Text style={styles.buttonText}>Debug Info</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 30,
  },
  recordingContainer: {
    alignItems: "center",
    width: "100%",
  },
  recordingTime: {
    fontSize: 48,
    marginBottom: 20,
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
    width: "80%",
  },
  recordButton: {
    backgroundColor: "#4CAF50",
  },
  stopButton: {
    backgroundColor: "#F44336",
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  uploadingContainer: {
    marginTop: 20,
    alignItems: "center",
  },
  uploadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  debugButton: {
    backgroundColor: "#9C27B0",
    marginTop: 20,
  },
  permissionButton: {
    backgroundColor: "#2196F3",
    marginBottom: 20,
  },
});

export default VoiceRecorder;
