#!/bin/bash

# Navigate to the project directory (uncomment and modify if needed)
# cd /path/to/your/project

echo "Removing node_modules and lock files..."
rm -rf node_modules
rm -f package-lock.json
rm -f yarn.lock

echo "Uninstalling dependencies..."
# Uninstall regular dependencies
npm uninstall react react-native react-native-audio-recorder-player react-native-fs react-native-permissions react-native-tensorflow axios

# Uninstall dev dependencies
npm uninstall --save-dev @types/react @types/react-native typescript @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-react-native

echo "Installing dependencies..."
# Install regular dependencies
npm install react react-native react-native-audio-recorder-player react-native-fs react-native-permissions react-native-tensorflow axios

# Install dev dependencies
npm install --save-dev @types/react @types/react-native typescript @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-react-native

echo "Dependencies reinstalled successfully!" 