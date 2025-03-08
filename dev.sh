#!/bin/bash

# Super simple development script that:
# 1. Deploys infrastructure with Pulumi
# 2. Sets up port forwarding for services
# 3. Starts code synchronization in the background

# Function to clean up on exit
cleanup() {
  echo "Shutting down port forwards and sync..."
  kill $(jobs -p) 2>/dev/null
  exit 0
}

# Set up trap to clean up on exit
trap cleanup EXIT INT TERM

# Deploy infrastructure with Pulumi
echo "Deploying infrastructure with Pulumi..."
cd conversation-app-infrastructure
pulumi up --yes
cd ..

# Set up port forwarding for services
echo "Setting up port forwarding..."
kubectl port-forward -n conversation-app svc/backend 3000:3000 9229:9229 &
kubectl port-forward -n conversation-app svc/mongodb 27017:27017 &
kubectl port-forward -n conversation-app svc/minio 9000:9000 9001:9001 &

# Start code synchronization in the background
echo "Starting code synchronization..."
./sync.sh &

echo "Development environment ready!"
echo "Access points:"
echo "- Backend API: http://localhost:3000"
echo "- Backend Debugger: localhost:9229"
echo "- MongoDB: mongodb://localhost:27017"
echo "- MinIO Console: http://localhost:9001"
echo "- MinIO API: http://localhost:9000"
echo ""
echo "Code synchronization is running in the background"
echo "Press Ctrl+C to stop everything"

# Keep the script running
wait 