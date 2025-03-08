# Conversation App Infrastructure

This Pulumi project sets up the infrastructure for the Conversation Recorder application on Kubernetes using Docker Desktop.

## Components

- **MinIO**: S3-compatible object storage for audio recordings and transcripts
- **MongoDB**: Database for metadata storage
- **Kubernetes Deployments**: For running the backend service
- **Ingress**: For routing external traffic to services
- **Monitoring Stack**: Comprehensive Kubernetes monitoring and visualization tools

## Monitoring Tools

The infrastructure includes a complete monitoring stack for Kubernetes:

- **Grafana**: Visualization dashboard for metrics and logs
- **Prometheus**: Metrics collection and alerting
- **Loki**: Log aggregation system
- **Kubernetes Dashboard**: Native Kubernetes UI for resource management
- **Alertmanager**: Alert handling and notifications

These tools provide:

- Real-time visualization of service health and request flows
- Detailed logs from all Kubernetes components
- Metrics on pod/service performance
- Alerts for service disruptions
- Native Kubernetes resource management

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
- Monitoring can be disabled by setting `enableMonitoring: false` in your Pulumi config

## Access

After deployment:

1. Add the following to your `/etc/hosts` file:

   ```
   127.0.0.1 conversation-app.local
   ```

2. Access services at:
   - Backend API: http://conversation-app.local/api
   - MinIO Console: http://conversation-app.local/minio
3. Access monitoring tools at:
   - Grafana: http://conversation-app.local/grafana (default credentials: admin/admin)
   - Prometheus: http://conversation-app.local/prometheus
   - Alertmanager: http://conversation-app.local/alertmanager
   - Kubernetes Dashboard: http://conversation-app.local/k8s-dashboard

## Using the Monitoring Tools

### Grafana

- View pre-configured dashboards for Kubernetes metrics
- Explore logs using the Loki data source
- Create custom dashboards for application-specific metrics

### Kubernetes Dashboard

- View the status of all Kubernetes resources
- Monitor pod health and resource usage
- Troubleshoot issues with deployments and services

### Prometheus

- Query metrics using PromQL
- Set up custom alerts
- Monitor resource usage and application performance

### Loki

- Search and filter logs from all containers
- Correlate logs with metrics for troubleshooting
- Set up log-based alerts

## Clean Up

To remove all resources:

```
pulumi destroy
```
