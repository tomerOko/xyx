#!/bin/bash

# Simple script to sync code changes to the backend pod

# If running in the background, redirect output to a log file
if [[ $- != *i* ]]; then
  exec > >(tee -a sync.log) 2>&1
  echo "Running in background mode, logging to sync.log"
fi

echo "Starting code synchronization for backend..."
cd conversation-processor-server

# Get the backend pod name
BACKEND_POD=$(kubectl get pods -n conversation-app -l app=backend -o jsonpath='{.items[0].metadata.name}')

if [ -z "$BACKEND_POD" ]; then
  echo "Error: Backend pod not found. Make sure the backend is deployed."
  exit 1
fi

echo "Found backend pod: $BACKEND_POD"
echo "Watching for changes in src directory..."
echo "Press Ctrl+C to stop synchronization"

# Use nodemon to watch for changes and sync them
nodemon --watch src --ext ts --exec "npm run build && kubectl cp dist/ conversation-app/$BACKEND_POD:/app/ && echo $(date): Code synchronized" 