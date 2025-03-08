# Conversation App Infrastructure

This Pulumi project sets up the infrastructure for the Conversation Recorder application on Kubernetes using Docker Desktop.

## Components

- **MinIO**: S3-compatible object storage for audio recordings and transcripts
- **MongoDB**: Database for metadata storage
- **Kubernetes Deployments**: For running the backend service
- **Ingress**: For routing external traffic to services

## Prerequisites

1. Docker Desktop with Kubernetes enabled
2. Pulumi CLI
3. Node.js and npm
4. Kubectl configured to use the docker-desktop context

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Create a new Pulumi stack:
   ```
   pulumi stack init dev
   ```

3. Deploy the infrastructure:
   ```
   pulumi up
   ```

## Configuration

- The infrastructure is configured to run in Docker Desktop's Kubernetes
- The backend service image needs to be built and pushed to a registry
- Update the `your-docker-registry/conversation-processor-server:latest` image reference in the code

## Access

After deployment:

1. Add the following to your `/etc/hosts` file:
   ```
   127.0.0.1 conversation-app.local
   ```

2. Access services at:
   - Backend API: http://conversation-app.local/api
   - MinIO Console: http://conversation-app.local/minio

## Clean Up

To remove all resources:

```
pulumi destroy
```
