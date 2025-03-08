FROM node:18-alpine

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build TypeScript code
RUN npm run build

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
CMD ["npm", "run", "start"]

# Development Dockerfile with file watching
FROM node:18-alpine as development

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies including development dependencies
RUN npm install

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application in development mode with hot reloading
CMD ["npm", "run", "dev"] 