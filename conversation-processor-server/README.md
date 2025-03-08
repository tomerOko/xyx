# Conversation Processor Server

A Node.js TypeScript server for processing audio recordings of conversations, storing them in S3, and transcribing them using a speech-to-text service.

## Features

- Receive and process audio uploads from the mobile app
- Store audio recordings in S3
- Transcribe audio using a speech-to-text service
- Provide API endpoints for retrieving transcriptions
- TypeScript for improved type safety and developer experience

## Setup

### Local Development

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

### Docker Development with File Syncing

For a containerized development environment with automatic file syncing and hot reloading:

1. Make sure Docker and docker-compose are installed and running.

2. Run the development script:
   ```
   ./dev.sh
   ```

This will:

- Build the Docker image using the development target in the Dockerfile
- Start the server in development mode with hot reloading
- Mount your local `src` directory into the container for real-time file syncing
- Any changes you make to the source code will be immediately reflected in the running container

### Kubernetes Deployment

The server can be deployed to Kubernetes using the Pulumi infrastructure code in the `conversation-app-infrastructure` directory. The deployment includes:

- Building the Docker image
- Deploying the server with file syncing for development
- Setting up the necessary environment variables and configurations

## API Endpoints

- `POST /api/audio-upload`: Upload audio recording
- `GET /api/transcripts/:id`: Get transcription by recording ID
- `GET /health`: Health check endpoint

## Requirements

- Node.js 16+
- TypeScript 4.5+
- AWS S3 for storage (or compatible service like LocalStack for development)
- Speech-to-text service (configurable)
- Docker and docker-compose (for containerized development)
