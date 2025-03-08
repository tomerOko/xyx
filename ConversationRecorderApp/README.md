# Conversation Recorder App

A React Native application for recording voice conversations and sending them to a server for processing.

## Features

- Record audio with a simple UI
- Display recording time
- Upload recordings to the server
- Handle permissions for microphone access

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure the server URL:
   Open `components/VoiceRecorder.tsx` and update the `SERVER_URL` constant with your server's URL.

3. Run the app:

```bash
npm start
```

Then follow the Expo instructions to run on your device or emulator.

## Usage

1. Launch the app
2. Tap the "Record" button to start recording
3. Tap the "Stop Recording" button to stop recording and upload the audio
4. The app will show a loading indicator while uploading

## Dependencies

- react-native-audio-recorder-player: For recording audio
- react-native-fs: For file system operations
- react-native-permissions: For handling microphone permissions
- axios: For making HTTP requests

## Troubleshooting

- If you encounter permission issues, make sure to grant microphone access to the app
- For iOS, ensure you have added the microphone usage description in Info.plist
- For Android, ensure you have added the RECORD_AUDIO permission in AndroidManifest.xml

## Server API

The app sends recorded audio to the server with the following payload:

```json
{
  "fileName": "recording_timestamp.wav",
  "audioData": "base64-encoded-audio-data",
  "timestamp": "ISO-date-string",
  "metadata": {
    "deviceInfo": {
      "platform": "ios/android",
      "version": "version-number"
    }
  }
}
```
