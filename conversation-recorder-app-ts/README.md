# Conversation Recorder App (TypeScript)

A React Native application (written in TypeScript) that continuously records audio, uses machine learning to detect conversations, and uploads only the conversation segments to a server for transcription.

## Features

- Continuous audio recording with 30-second segments
- On-device conversation detection using TensorFlow Lite
- Upload of detected conversations to backend
- Status monitoring and recording management
- Built with TypeScript for improved type safety and developer experience

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Run on Android:
   ```
   npm run android
   ```

3. Run on iOS:
   ```
   npm run ios
   ```

## Configuration

Update the API_URL in `src/api/audioService.ts` to point to your backend server.

## Requirements

- React Native 0.73.0 or higher
- TypeScript 5.0.4 or higher
- Android 6.0+ or iOS 12.0+
- Permissions for microphone and storage access
