# Development Environment

This project uses a simple shell script for local development, which provides:

1. **Live code synchronization** for the backend service
2. **Port forwarding** for debugging and database connections
3. **Easy access** to services like MongoDB and MinIO

## Prerequisites

- [Docker](https://www.docker.com/products/docker-desktop/)
- [Node.js](https://nodejs.org/) (v16 or later)
- [npm](https://www.npmjs.com/) (v7 or later)

## Getting Started

1. **Start the development environment**:

   ```bash
   # Make the script executable
   chmod +x ./dev.sh

   # Run the development script
   ./dev.sh
   ```

   This will:

   - Start MongoDB and MinIO in Docker containers
   - Set up the necessary environment variables
   - Start the backend service with live reloading and debugging enabled

2. **Stop the development environment**:

   Press `Ctrl+C` in the terminal where the script is running.

## Available Services

Once the development environment is running, you can access the following services:

- **Backend API**: [http://localhost:3000](http://localhost:3000)
- **MongoDB**: `mongodb://localhost:27017`
  - Username: `admin`
  - Password: `dev-password`
  - Connection string: `mongodb://admin:dev-password@localhost:27017/recordings?authSource=admin`
- **MinIO Console**: [http://localhost:9001](http://localhost:9001)
  - Username: `minio`
  - Password: `minio-secret-key`
- **MinIO API**: [http://localhost:9000](http://localhost:9000)

## Debugging the Backend Service

### Using VSCode

1. Start the development environment using the script or the VSCode task.

2. Use the "Attach to Backend" launch configuration in VSCode.

3. Set breakpoints in your code and debug as usual.

### Using Chrome DevTools

1. Start the development environment using the script.

2. Open Chrome and navigate to `chrome://inspect`

3. Click on "Open dedicated DevTools for Node"

4. Connect to `localhost:9229`

## Code Synchronization

The development script uses nodemon to automatically detect changes to your TypeScript files:

- Changes to `conversation-processor-server/src/**` files are detected automatically
- The TypeScript compiler runs automatically when files change
- The server restarts automatically when compiled files change

## Accessing Database with UI Tools

### MongoDB

You can use tools like [MongoDB Compass](https://www.mongodb.com/products/compass) or [Studio 3T](https://studio3t.com/) to connect to the MongoDB instance:

- **Connection String**: `mongodb://admin:dev-password@localhost:27017/recordings?authSource=admin`

### MinIO (S3-compatible storage)

You can use the MinIO Console or tools like [S3 Browser](https://s3browser.com/) to connect to MinIO:

- **Endpoint**: `http://localhost:9000`
- **Access Key**: `minio`
- **Secret Key**: `minio-secret-key`
- **Use path style access**: Yes

## Troubleshooting

### Services not starting

If any service fails to start, check the output of the script for error messages.

### Port conflicts

If you have port conflicts, edit the `dev.sh` script and change the port mappings in the Docker run commands.
