# Conversation Processor Server

A Node.js TypeScript server for processing audio recordings of conversations, storing them in S3, and transcribing them using a speech-to-text service.

## Features

- Receive and process audio uploads from the mobile app
- Store audio recordings in S3
- Transcribe audio using a speech-to-text service
- Provide API endpoints for retrieving transcriptions
- TypeScript for improved type safety and developer experience

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file based on the provided example and update with your configuration.

3. Run the development server:
   ```
   npm run dev
   ```

4. For production, build and run:
   ```
   npm run build
   npm start
   ```

## API Endpoints

- `POST /api/audio-upload`: Upload audio recording
- `GET /api/transcripts/:id`: Get transcription by recording ID
- `GET /health`: Health check endpoint

## Requirements

- Node.js 16+
- TypeScript 4.5+
- AWS S3 for storage (or compatible service like LocalStack for development)
- Speech-to-text service (configurable)
