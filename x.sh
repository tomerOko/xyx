#!/bin/bash

# Exit on error
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Conversation Recorder Development Setup ===${NC}"

# Check if required tools are installed
check_requirements() {
  echo -e "${BLUE}Checking requirements...${NC}"
  
  # Check Node.js
  if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
  fi
  
  # Check npm
  if ! command -v npm &> /dev/null; then
    echo -e "${RED}npm is not installed. Please install npm first.${NC}"
    exit 1
  fi
  
  # Check React Native CLI
  if ! command -v npx &> /dev/null; then
    echo -e "${RED}npx is not installed. Please install it with 'npm install -g npx'${NC}"
    exit 1
  fi
  
  # Check Docker
  if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Docker is not installed. It's required for the backend services.${NC}"
    read -p "Continue without Docker? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      exit 1
    fi
    DOCKER_AVAILABLE=false
  else
    DOCKER_AVAILABLE=true
  fi
  
  # Check if emulator is available (Android)
  if ! command -v adb &> /dev/null; then
    echo -e "${YELLOW}Android Debug Bridge (adb) is not found. Android emulator might not work.${NC}"
    ANDROID_AVAILABLE=false
  else
    ANDROID_AVAILABLE=true
  fi
  
  # Check if Xcode is installed (macOS only)
  if [[ "$OSTYPE" == "darwin"* ]]; then
    if ! command -v xcodebuild &> /dev/null; then
      echo -e "${YELLOW}Xcode is not installed. iOS simulator might not work.${NC}"
      IOS_AVAILABLE=false
    else
      IOS_AVAILABLE=true
    fi
  else
    IOS_AVAILABLE=false
  fi
  
  echo -e "${GREEN}Requirements check completed.${NC}"
}

# Setup directories and find project components
setup_directories() {
  echo -e "${BLUE}Setting up directories...${NC}"
  
  # Find the React Native app
  if [ -d "conversation-recorder-app-ts" ]; then
    RN_APP_DIR="conversation-recorder-app-ts"
  elif [ -d "conversation-recorder-app" ]; then
    RN_APP_DIR="conversation-recorder-app"
  else
    echo -e "${RED}Could not find the React Native app directory.${NC}"
    exit 1
  fi
  
  # Find the Node.js server
  if [ -d "conversation-processor-server" ]; then
    SERVER_DIR="conversation-processor-server"
  else
    echo -e "${YELLOW}Could not find the Node.js server directory.${NC}"
    SERVER_DIR=""
  fi
  
  # Find the Pulumi infrastructure
  if [ -d "conversation-app-infrastructure" ]; then
    INFRA_DIR="conversation-app-infrastructure"
  else
    echo -e "${YELLOW}Could not find the Pulumi infrastructure directory.${NC}"
    INFRA_DIR=""
  fi
  
  echo -e "${GREEN}Found React Native app in: ${RN_APP_DIR}${NC}"
  if [ -n "$SERVER_DIR" ]; then
    echo -e "${GREEN}Found Node.js server in: ${SERVER_DIR}${NC}"
  fi
  if [ -n "$INFRA_DIR" ]; then
    echo -e "${GREEN}Found Pulumi infrastructure in: ${INFRA_DIR}${NC}"
  fi
}

# Install dependencies for all projects
install_dependencies() {
  echo -e "${BLUE}Installing dependencies...${NC}"
  
  # Install React Native app dependencies
  echo -e "${BLUE}Installing React Native app dependencies...${NC}"
  cd "$RN_APP_DIR"
  npm install
  cd ..
  
  # Install Node.js server dependencies if available
  if [ -n "$SERVER_DIR" ]; then
    echo -e "${BLUE}Installing Node.js server dependencies...${NC}"
    cd "$SERVER_DIR"
    npm install
    cd ..
  fi
  
  # Install Pulumi infrastructure dependencies if available
  if [ -n "$INFRA_DIR" ]; then
    echo -e "${BLUE}Installing Pulumi infrastructure dependencies...${NC}"
    cd "$INFRA_DIR"
    npm install
    cd ..
  fi
  
  echo -e "${GREEN}Dependencies installed successfully.${NC}"
}

# Start local infrastructure with Docker and Kubernetes
start_infrastructure() {
  if [ "$DOCKER_AVAILABLE" = true ] && [ -n "$INFRA_DIR" ]; then
    echo -e "${BLUE}Starting local infrastructure...${NC}"
    
    # Check if Docker Desktop is running
    if ! docker info &> /dev/null; then
      echo -e "${YELLOW}Docker Desktop is not running. Please start it first.${NC}"
      return
    fi
    
    # Check if Kubernetes is enabled in Docker Desktop
    if ! kubectl version &> /dev/null; then
      echo -e "${YELLOW}Kubernetes is not enabled in Docker Desktop. Please enable it in Docker Desktop settings.${NC}"
      return
    fi
    
    # Deploy infrastructure with Pulumi
    cd "$INFRA_DIR"
    
    # Check if a Pulumi stack exists, create one if not
    if ! pulumi stack ls &> /dev/null; then
      echo -e "${BLUE}Initializing Pulumi stack...${NC}"
      pulumi stack init dev
    fi
    
    echo -e "${BLUE}Deploying infrastructure with Pulumi...${NC}"
    pulumi up --skip-preview
    
    # Get the URLs and credentials for the services
    export MINIO_USER=$(pulumi stack output minioAdminUser)
    export MINIO_PASSWORD=$(pulumi stack output minioAdminPassword)
    export MINIO_ENDPOINT=$(pulumi stack output minioApiUrl)
    export BACKEND_URL=$(pulumi stack output backendApiUrl)
    
    echo -e "${GREEN}Infrastructure started successfully.${NC}"
    echo -e "${YELLOW}Don't forget to add the host entry to your /etc/hosts file:${NC}"
    pulumi stack output hostsEntryReminder
    
    cd ..
  else
    echo -e "${YELLOW}Skipping infrastructure setup (Docker not available or Infra dir not found).${NC}"
  fi
}

# Start the Node.js server
start_server() {
  if [ -n "$SERVER_DIR" ]; then
    echo -e "${BLUE}Starting Node.js server...${NC}"
    
    cd "$SERVER_DIR"
    
    # Check if the server is already running
    SERVER_PID=$(lsof -t -i:3000 2>/dev/null)
    if [ -n "$SERVER_PID" ]; then
      echo -e "${YELLOW}A server is already running on port 3000. Killing it...${NC}"
      kill -9 $SERVER_PID
    fi
    
    # Start the server in development mode in a new terminal window
    if [[ "$OSTYPE" == "darwin"* ]]; then
      # macOS
      osascript -e "tell application \"Terminal\" to do script \"cd $(pwd) && npm run dev\""
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
      # Linux
      if command -v gnome-terminal &> /dev/null; then
        gnome-terminal -- bash -c "cd $(pwd) && npm run dev; exec bash"
      elif command -v xterm &> /dev/null; then
        xterm -e "cd $(pwd) && npm run dev" &
      else
        echo -e "${YELLOW}Could not open a new terminal window. Starting server in background...${NC}"
        npm run dev &
      fi
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
      # Windows
      start "Node.js Server" cmd /k "cd $(pwd) && npm run dev"
    else
      echo -e "${YELLOW}Could not detect OS type. Starting server in background...${NC}"
      npm run dev &
    fi
    
    cd ..
    
    echo -e "${GREEN}Server started successfully.${NC}"
  else
    echo -e "${YELLOW}Skipping server start (Server dir not found).${NC}"
  fi
}

# Start the React Native app and emulator
start_react_native() {
  echo -e "${BLUE}Starting React Native app...${NC}"
  
  cd "$RN_APP_DIR"
  
  # Update API URL in the app configuration
  if [ -n "$BACKEND_URL" ]; then
    echo -e "${BLUE}Updating API URL to ${BACKEND_URL}...${NC}"
    # Find the file with API_URL
    API_FILE=$(grep -l "API_URL" src/api/audioService.ts 2>/dev/null || grep -l "API_URL" src/api/audioService.js 2>/dev/null)
    if [ -n "$API_FILE" ]; then
      sed -i.bak "s|const API_URL = .*|const API_URL = '$BACKEND_URL';|g" "$API_FILE"
      rm -f "${API_FILE}.bak"
    else
      echo -e "${YELLOW}Could not find API URL configuration file.${NC}"
    fi
  fi
  
  # Start Android emulator if available
  if [ "$ANDROID_AVAILABLE" = true ]; then
    echo -e "${BLUE}Setting up Android emulator...${NC}"
    
    # List available emulators
    EMULATORS=$(emulator -list-avds)
    if [ -z "$EMULATORS" ]; then
      echo -e "${YELLOW}No Android emulators found. Creating a default one...${NC}"
      echo -e "${YELLOW}This might take a while...${NC}"
      
      # Create a default emulator
      echo "no" | avdmanager create avd -n ConversationRecorder -k "system-images;android-30;google_apis;x86_64" -d "pixel_2"
      
      EMULATOR="ConversationRecorder"
    else
      # Use the first available emulator
      EMULATOR=$(echo "$EMULATORS" | head -n 1)
    fi
    
    echo -e "${BLUE}Starting Android emulator: ${EMULATOR}...${NC}"
    
    # Start the emulator in a new terminal window
    if [[ "$OSTYPE" == "darwin"* ]]; then
      # macOS
      osascript -e "tell application \"Terminal\" to do script \"cd $(pwd) && emulator -avd ${EMULATOR}\""
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
      # Linux
      if command -v gnome-terminal &> /dev/null; then
        gnome-terminal -- bash -c "cd $(pwd) && emulator -avd ${EMULATOR}; exec bash"
      elif command -v xterm &> /dev/null; then
        xterm -e "cd $(pwd) && emulator -avd ${EMULATOR}" &
      else
        echo -e "${YELLOW}Could not open a new terminal window. Starting emulator in background...${NC}"
        emulator -avd "${EMULATOR}" &
      fi
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
      # Windows
      start "Android Emulator" cmd /k "cd $(pwd) && emulator -avd ${EMULATOR}"
    else
      echo -e "${YELLOW}Could not detect OS type. Starting emulator in background...${NC}"
      emulator -avd "${EMULATOR}" &
    fi
    
    # Wait for emulator to boot
    echo -e "${BLUE}Waiting for emulator to boot...${NC}"
    adb wait-for-device
    
    # Start the app on Android
    echo -e "${BLUE}Starting React Native app on Android...${NC}"
    npx react-native run-android
    
  elif [ "$IOS_AVAILABLE" = true ]; then
    # Start the app on iOS
    echo -e "${BLUE}Starting React Native app on iOS simulator...${NC}"
    npx react-native run-ios
  else
    echo -e "${YELLOW}No emulator available. Starting React Native packager only...${NC}"
    npx react-native start
  fi
  
  cd ..
  
  echo -e "${GREEN}React Native app started successfully.${NC}"
}

# Main function
main() {
  check_requirements
  setup_directories
  install_dependencies
  start_infrastructure
  start_server
  start_react_native
  
  echo -e "${GREEN}=== Development environment is now running ===${NC}"
  echo -e "${GREEN}React Native app: ${RN_APP_DIR}${NC}"
  if [ -n "$SERVER_DIR" ]; then
    echo -e "${GREEN}Node.js server: ${SERVER_DIR}${NC}"
  fi
  if [ -n "$INFRA_DIR" ]; then
    echo -e "${GREEN}Infrastructure: ${INFRA_DIR}${NC}"
  fi
  
  echo -e "${BLUE}Happy coding!${NC}"
}

# Run the main function
main