import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import * as docker from '@pulumi/docker';
import * as random from '@pulumi/random';

// Configuration
const config = new pulumi.Config();
const appName = 'conversation-app';
const appLabels = { app: appName };
// Add monitoring configuration
const enableMonitoring = config.getBoolean('enableMonitoring') ?? true;
const monitoringNamespace = 'monitoring';

// Generate a random password for the minio (S3) admin user
const minioPassword = new random.RandomPassword('minio-password', {
    length: 16,
    special: false,
});

// Create a Kubernetes provider instance that targets minikube or Docker Desktop
const provider = new k8s.Provider('k8s-provider', {
    context: 'docker-desktop',  // This should match your kubectl context for Docker Desktop
    namespace: 'default',
});

// Create a namespace for our application
const namespace = new k8s.core.v1.Namespace('app-namespace', {
    metadata: {
        name: appName,
    },
}, { provider });

// Deploy MinIO as S3-compatible storage
// Create a ConfigMap for MinIO configuration
const minioConfigMap = new k8s.core.v1.ConfigMap('minio-config', {
    metadata: {
        name: 'minio-config',
        namespace: namespace.metadata.name,
    },
    data: {
        'MINIO_ROOT_USER': 'minio',
        'MINIO_ROOT_PASSWORD': minioPassword.result,
        'BUCKET_RECORDINGS': 'recordings',
        'BUCKET_TRANSCRIPTS': 'transcripts',
    },
}, { provider });

// Create MinIO Deployment
const minioDeployment = new k8s.apps.v1.Deployment('minio', {
    metadata: {
        name: 'minio',
        namespace: namespace.metadata.name,
    },
    spec: {
        selector: {
            matchLabels: { app: 'minio' },
        },
        replicas: 1,
        template: {
            metadata: {
                labels: { app: 'minio' },
            },
            spec: {
                containers: [{
                    name: 'minio',
                    image: 'minio/minio:RELEASE.2023-10-16T04-13-43Z',
                    args: ['server', '/data', '--console-address', ':9001'],
                    ports: [
                        { containerPort: 9000, name: 'api' },
                        { containerPort: 9001, name: 'console' },
                    ],
                    envFrom: [{
                        configMapRef: { name: minioConfigMap.metadata.name },
                    }],
                    volumeMounts: [{
                        name: 'minio-data',
                        mountPath: '/data',
                    }],
                }],
                volumes: [{
                    name: 'minio-data',
                    persistentVolumeClaim: {
                        claimName: 'minio-pvc',
                    },
                }],
            },
        },
    },
}, { provider });

// Create PVC for MinIO data
const minioPvc = new k8s.core.v1.PersistentVolumeClaim('minio-pvc', {
    metadata: {
        name: 'minio-pvc',
        namespace: namespace.metadata.name,
    },
    spec: {
        accessModes: ['ReadWriteOnce'],
        resources: {
            requests: {
                storage: '10Gi',
            },
        },
    },
}, { provider });

// Create MinIO Service
const minioService = new k8s.core.v1.Service('minio-service', {
    metadata: {
        name: 'minio',
        namespace: namespace.metadata.name,
    },
    spec: {
        selector: { app: 'minio' },
        ports: [
            { port: 9000, targetPort: 9000, name: 'api' },
            { port: 9001, targetPort: 9001, name: 'console' },
        ],
        type: 'ClusterIP',
    },
}, { provider });

// Create MinIO initialization job to create buckets
const minioInitJob = new k8s.batch.v1.Job('minio-init', {
    metadata: {
        name: 'minio-init',
        namespace: namespace.metadata.name,
    },
    spec: {
        template: {
            spec: {
                containers: [{
                    name: 'mc',
                    image: 'minio/mc:latest',
                    command: ['/bin/sh', '-c'],
                    args: [pulumi.interpolate`
                        mc alias set myminio http://minio:9000 minio ${minioPassword.result} &&
                        mc mb myminio/recordings || true &&
                        mc mb myminio/transcripts || true
                    `],
                }],
                restartPolicy: 'OnFailure',
            },
        },
        backoffLimit: 3,
    },
}, { provider, dependsOn: [minioService, minioDeployment] });

// Deploy MongoDB for metadata storage
const mongoDbPassword = new random.RandomPassword('mongodb-password', {
    length: 16,
    special: false,
});

// Create MongoDB ConfigMap
const mongoConfigMap = new k8s.core.v1.ConfigMap('mongo-config', {
    metadata: {
        name: 'mongo-config',
        namespace: namespace.metadata.name,
    },
    data: {
        'MONGO_INITDB_ROOT_USERNAME': 'admin',
        'MONGO_INITDB_ROOT_PASSWORD': mongoDbPassword.result,
        'MONGO_INITDB_DATABASE': 'recordings',
    },
}, { provider });

// Create MongoDB Deployment
const mongoDeployment = new k8s.apps.v1.Deployment('mongodb', {
    metadata: {
        name: 'mongodb',
        namespace: namespace.metadata.name,
    },
    spec: {
        selector: {
            matchLabels: { app: 'mongodb' },
        },
        replicas: 1,
        template: {
            metadata: {
                labels: { app: 'mongodb' },
            },
            spec: {
                containers: [{
                    name: 'mongodb',
                    image: 'mongo:6.0',
                    ports: [{ containerPort: 27017 }],
                    envFrom: [{
                        configMapRef: { name: mongoConfigMap.metadata.name },
                    }],
                    volumeMounts: [{
                        name: 'mongo-data',
                        mountPath: '/data/db',
                    }],
                }],
                volumes: [{
                    name: 'mongo-data',
                    persistentVolumeClaim: {
                        claimName: 'mongo-pvc',
                    },
                }],
            },
        },
    },
}, { provider });

// Create PVC for MongoDB data
const mongoPvc = new k8s.core.v1.PersistentVolumeClaim('mongo-pvc', {
    metadata: {
        name: 'mongo-pvc',
        namespace: namespace.metadata.name,
    },
    spec: {
        accessModes: ['ReadWriteOnce'],
        resources: {
            requests: {
                storage: '5Gi',
            },
        },
    },
}, { provider });

// Create MongoDB Service
const mongoService = new k8s.core.v1.Service('mongo-service', {
    metadata: {
        name: 'mongodb',
        namespace: namespace.metadata.name,
    },
    spec: {
        selector: { app: 'mongodb' },
        ports: [{ port: 27017, targetPort: 27017 }],
        type: 'ClusterIP',
    },
}, { provider });

// Create MongoDB initialization to create collections
const mongoInitJob = new k8s.batch.v1.Job('mongo-init', {
    metadata: {
        name: 'mongo-init',
        namespace: namespace.metadata.name,
    },
    spec: {
        template: {
            spec: {
                containers: [{
                    name: 'mongo-init',
                    image: 'mongo:6.0',
                    command: ['/bin/sh', '-c'],
                    args: [pulumi.interpolate`
                        mongosh "mongodb://admin:${mongoDbPassword.result}@mongodb:27017/recordings?authSource=admin" --eval '
                        db.createCollection("recordings");
                        db.createCollection("transcripts");
                        db.recordings.createIndex({ "userId": 1, "timestamp": -1 });
                        db.recordings.createIndex({ "status": 1 });
                        '
                    `],
                }],
                restartPolicy: 'OnFailure',
            },
        },
        backoffLimit: 3,
    },
}, { provider, dependsOn: [mongoService, mongoDeployment] });

// Create ConfigMap for the backend service
const backendConfigMap = new k8s.core.v1.ConfigMap('backend-config', {
    metadata: {
        name: 'backend-config',
        namespace: namespace.metadata.name,
    },
    data: {
        'NODE_ENV': 'development',
        'PORT': '3000',
        'MONGO_URI': pulumi.interpolate`mongodb://admin:${mongoDbPassword.result}@mongodb:27017/recordings?authSource=admin`,
        'S3_ENDPOINT': 'http://minio:9000',
        'S3_ACCESS_KEY': 'minio',
        'S3_SECRET_KEY': minioPassword.result,
        'S3_BUCKET_RECORDINGS': 'recordings',
        'S3_BUCKET_TRANSCRIPTS': 'transcripts',
        'S3_FORCE_PATH_STYLE': 'true',
    },
}, { provider });

// Create Backend Deployment
const backendDeployment = new k8s.apps.v1.Deployment('backend', {
    metadata: {
        name: 'backend',
        namespace: namespace.metadata.name,
    },
    spec: {
        selector: {
            matchLabels: { app: 'backend' },
        },
        replicas: 2,
        template: {
            metadata: {
                labels: { app: 'backend' },
            },
            spec: {
                containers: [{
                    name: 'backend',
                    image: 'nginx:latest',
                    ports: [{ containerPort: 80 }],
                    envFrom: [{
                        configMapRef: { name: backendConfigMap.metadata.name },
                    }],
                    readinessProbe: {
                        httpGet: {
                            path: '/',
                            port: 80,
                        },
                        initialDelaySeconds: 10,
                        periodSeconds: 5,
                    },
                    livenessProbe: {
                        httpGet: {
                            path: '/',
                            port: 80,
                        },
                        initialDelaySeconds: 30,
                        periodSeconds: 15,
                    },
                }],
            },
        },
    },
}, { provider, dependsOn: [minioInitJob, mongoInitJob] });

// Create Backend Service
const backendService = new k8s.core.v1.Service('backend-service', {
    metadata: {
        name: 'backend',
        namespace: namespace.metadata.name,
    },
    spec: {
        selector: { app: 'backend' },
        ports: [{ port: 3000, targetPort: 80 }],
        type: 'ClusterIP',
    },
}, { provider });

// Create Ingress for exposing services
const ingress = new k8s.networking.v1.Ingress('app-ingress', {
    metadata: {
        name: 'app-ingress',
        namespace: namespace.metadata.name,
        annotations: {
            'kubernetes.io/ingress.class': 'nginx',
            'nginx.ingress.kubernetes.io/rewrite-target': '/$2',
            'nginx.ingress.kubernetes.io/use-regex': 'true',
        },
    },
    spec: {
        rules: [
            {
                host: 'conversation-app.local',
                http: {
                    paths: [
                        {
                            path: '/api(/|$)(.*)',
                            pathType: 'ImplementationSpecific',
                            backend: {
                                service: {
                                    name: backendService.metadata.name,
                                    port: { number: 3000 },
                                },
                            },
                        },
                        {
                            path: '/minio(/|$)(.*)',
                            pathType: 'ImplementationSpecific',
                            backend: {
                                service: {
                                    name: minioService.metadata.name,
                                    port: { number: 9001 },
                                },
                            },
                        },
                    ],
                },
            },
        ],
    },
}, { provider });

// Deploy Kube-Prometheus Stack for Kubernetes monitoring and visualization
if (enableMonitoring) {
    // Create a namespace for monitoring tools
    const monitoringNs = new k8s.core.v1.Namespace('monitoring-namespace', {
        metadata: {
            name: monitoringNamespace,
        },
    }, { provider });

    // Deploy Prometheus Operator using Helm
    const prometheusOperator = new k8s.helm.v3.Release('prometheus-operator', {
        chart: 'kube-prometheus-stack',
        version: '45.7.1', // Specify a stable version
        namespace: monitoringNs.metadata.name,
        repositoryOpts: {
            repo: 'https://prometheus-community.github.io/helm-charts',
        },
        values: {
            grafana: {
                enabled: true,
                adminPassword: 'admin', // In production, use a secret
                service: {
                    type: 'ClusterIP',
                },
                ingress: {
                    enabled: true,
                    hosts: ['grafana.conversation-app.local'],
                    path: '/',
                },
                additionalDataSources: [
                    {
                        name: 'Loki',
                        type: 'loki',
                        url: 'http://loki-gateway.monitoring:80',
                        access: 'proxy',
                    },
                ],
                dashboardProviders: {
                    dashboardproviders: {
                        apiVersion: 1,
                        providers: [
                            {
                                name: 'kubernetes',
                                orgId: 1,
                                folder: 'Kubernetes',
                                type: 'file',
                                disableDeletion: false,
                                editable: true,
                                options: {
                                    path: '/var/lib/grafana/dashboards/kubernetes',
                                },
                            },
                        ],
                    },
                },
                resources: {
                    limits: {
                        cpu: '200m',
                        memory: '256Mi',
                    },
                    requests: {
                        cpu: '100m',
                        memory: '128Mi',
                    },
                },
            },
            prometheus: {
                enabled: true,
                service: {
                    type: 'ClusterIP',
                },
                ingress: {
                    enabled: true,
                    hosts: ['prometheus.conversation-app.local'],
                    path: '/',
                },
                prometheusSpec: {
                    resources: {
                        limits: {
                            cpu: '500m',
                            memory: '512Mi',
                        },
                        requests: {
                            cpu: '200m',
                            memory: '256Mi',
                        },
                    },
                    retention: '1d', // Reduce retention period to save resources
                    scrapeInterval: '30s', // Increase scrape interval to reduce load
                },
            },
            alertmanager: {
                enabled: true,
                service: {
                    type: 'ClusterIP',
                },
                ingress: {
                    enabled: true,
                    hosts: ['alertmanager.conversation-app.local'],
                    path: '/',
                },
                alertmanagerSpec: {
                    resources: {
                        limits: {
                            cpu: '100m',
                            memory: '256Mi',
                        },
                        requests: {
                            cpu: '50m',
                            memory: '128Mi',
                        },
                    },
                },
            },
            prometheusOperator: {
                resources: {
                    limits: {
                        cpu: '200m',
                        memory: '256Mi',
                    },
                    requests: {
                        cpu: '100m',
                        memory: '128Mi',
                    },
                },
            },
            'kube-state-metrics': {
                resources: {
                    limits: {
                        cpu: '100m',
                        memory: '128Mi',
                    },
                    requests: {
                        cpu: '50m',
                        memory: '64Mi',
                    },
                },
            },
            nodeExporter: {
                enabled: false,
            },
        },
        timeout: 600, // 10 minutes timeout
    }, { provider });

    // Deploy Loki for log aggregation
    const loki = new k8s.helm.v3.Release('loki-stack', {
        chart: 'loki-stack',
        version: '2.9.10', // Specify a stable version
        namespace: monitoringNs.metadata.name,
        repositoryOpts: {
            repo: 'https://grafana.github.io/helm-charts',
        },
        values: {
            loki: {
                enabled: true,
            },
            promtail: {
                enabled: true,
                config: {
                    lokiAddress: 'http://loki-gateway.monitoring:80/loki/api/v1/push',
                },
            },
            grafana: {
                enabled: false, // We're using the Grafana from kube-prometheus-stack
            },
        },
    }, { provider });

    // Deploy Kubernetes Dashboard for a native K8s UI
    const k8sDashboard = new k8s.helm.v3.Release('kubernetes-dashboard', {
        chart: 'kubernetes-dashboard',
        version: '6.0.8', // Specify a stable version
        namespace: monitoringNs.metadata.name,
        repositoryOpts: {
            repo: 'https://kubernetes.github.io/dashboard/',
        },
        values: {
            service: {
                type: 'ClusterIP',
            },
            ingress: {
                enabled: true,
                hosts: ['k8s-dashboard.conversation-app.local'],
                path: '/',
            },
            metricsScraper: {
                enabled: true,
            },
        },
    }, { provider });

    // Create an Ingress for the monitoring tools
    // Get the enableMonitoringIngress config value, default to false to avoid initial deployment issues
    const enableMonitoringIngress = config.getBoolean('enableMonitoringIngress') ?? false;
    
    if (enableMonitoringIngress) {
        // Create stable services that select the backend pods by labels
        // These services will have consistent names regardless of the underlying deployment names
        
        // Grafana Service
        const stableGrafanaService = new k8s.core.v1.Service('stable-grafana-service', {
            metadata: {
                name: 'stable-grafana',
                namespace: monitoringNs.metadata.name,
                annotations: {
                    'nginx.ingress.kubernetes.io/service-upstream': 'true',
                },
            },
            spec: {
                selector: {
                    'app.kubernetes.io/name': 'grafana',
                },
                ports: [{
                    name: 'http',
                    port: 80,
                    targetPort: 3000,
                    protocol: 'TCP',
                }],
            },
        }, { provider, dependsOn: [prometheusOperator] });

        // Prometheus Service
        const stablePrometheusService = new k8s.core.v1.Service('stable-prometheus-service', {
            metadata: {
                name: 'stable-prometheus',
                namespace: monitoringNs.metadata.name,
                annotations: {
                    'nginx.ingress.kubernetes.io/service-upstream': 'true',
                },
            },
            spec: {
                selector: {
                    'app.kubernetes.io/name': 'prometheus',
                },
                ports: [{
                    name: 'http',
                    port: 9090,
                    targetPort: 9090,
                    protocol: 'TCP',
                }],
            },
        }, { provider, dependsOn: [prometheusOperator] });

        // Alertmanager Service
        const stableAlertmanagerService = new k8s.core.v1.Service('stable-alertmanager-service', {
            metadata: {
                name: 'stable-alertmanager',
                namespace: monitoringNs.metadata.name,
                annotations: {
                    'nginx.ingress.kubernetes.io/service-upstream': 'true',
                },
            },
            spec: {
                selector: {
                    'app.kubernetes.io/name': 'alertmanager',
                },
                ports: [{
                    name: 'http',
                    port: 9093,
                    targetPort: 9093,
                    protocol: 'TCP',
                }],
            },
        }, { provider, dependsOn: [prometheusOperator] });

        // Kubernetes Dashboard Service
        const stableK8sDashboardService = new k8s.core.v1.Service('stable-k8s-dashboard-service', {
            metadata: {
                name: 'stable-k8s-dashboard',
                namespace: monitoringNs.metadata.name,
                annotations: {
                    'nginx.ingress.kubernetes.io/service-upstream': 'true',
                },
            },
            spec: {
                selector: {
                    'app.kubernetes.io/component': 'kubernetes-dashboard',
                },
                ports: [{
                    name: 'https',
                    port: 443,
                    targetPort: 8443,
                    protocol: 'TCP',
                }],
            },
        }, { provider, dependsOn: [k8sDashboard] });

        // Create separate ingress resources for each service
        
        // Grafana Ingress
        const grafanaIngress = new k8s.networking.v1.Ingress('grafana-ingress', {
            metadata: {
                name: 'grafana-ingress',
                namespace: monitoringNs.metadata.name,
                annotations: {
                    'nginx.ingress.kubernetes.io/rewrite-target': '/$2',
                    'kubernetes.io/ingress.class': 'nginx',
                    'nginx.ingress.kubernetes.io/ssl-redirect': 'false',
                    'nginx.ingress.kubernetes.io/proxy-body-size': '0',
                    'nginx.ingress.kubernetes.io/proxy-read-timeout': '600',
                    'nginx.ingress.kubernetes.io/proxy-send-timeout': '600',
                },
            },
            spec: {
                rules: [
                    {
                        host: 'conversation-app.local',
                        http: {
                            paths: [
                                {
                                    path: '/grafana(/|$)(.*)',
                                    pathType: 'ImplementationSpecific',
                                    backend: {
                                        service: {
                                            name: stableGrafanaService.metadata.name,
                                            port: { number: 80 },
                                        },
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        }, { provider, dependsOn: [stableGrafanaService] });

        // Prometheus Ingress
        const prometheusIngress = new k8s.networking.v1.Ingress('prometheus-ingress', {
            metadata: {
                name: 'prometheus-ingress',
                namespace: monitoringNs.metadata.name,
                annotations: {
                    'nginx.ingress.kubernetes.io/rewrite-target': '/$2',
                    'kubernetes.io/ingress.class': 'nginx',
                    'nginx.ingress.kubernetes.io/ssl-redirect': 'false',
                    'nginx.ingress.kubernetes.io/proxy-body-size': '0',
                    'nginx.ingress.kubernetes.io/proxy-read-timeout': '600',
                    'nginx.ingress.kubernetes.io/proxy-send-timeout': '600',
                },
            },
            spec: {
                rules: [
                    {
                        host: 'conversation-app.local',
                        http: {
                            paths: [
                                {
                                    path: '/prometheus(/|$)(.*)',
                                    pathType: 'ImplementationSpecific',
                                    backend: {
                                        service: {
                                            name: stablePrometheusService.metadata.name,
                                            port: { number: 9090 },
                                        },
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        }, { provider, dependsOn: [stablePrometheusService] });

        // Alertmanager Ingress
        const alertmanagerIngress = new k8s.networking.v1.Ingress('alertmanager-ingress', {
            metadata: {
                name: 'alertmanager-ingress',
                namespace: monitoringNs.metadata.name,
                annotations: {
                    'nginx.ingress.kubernetes.io/rewrite-target': '/$2',
                    'kubernetes.io/ingress.class': 'nginx',
                    'nginx.ingress.kubernetes.io/ssl-redirect': 'false',
                    'nginx.ingress.kubernetes.io/proxy-body-size': '0',
                    'nginx.ingress.kubernetes.io/proxy-read-timeout': '600',
                    'nginx.ingress.kubernetes.io/proxy-send-timeout': '600',
                },
            },
            spec: {
                rules: [
                    {
                        host: 'conversation-app.local',
                        http: {
                            paths: [
                                {
                                    path: '/alertmanager(/|$)(.*)',
                                    pathType: 'ImplementationSpecific',
                                    backend: {
                                        service: {
                                            name: stableAlertmanagerService.metadata.name,
                                            port: { number: 9093 },
                                        },
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        }, { provider, dependsOn: [stableAlertmanagerService] });

        // Kubernetes Dashboard Ingress
        const k8sDashboardIngress = new k8s.networking.v1.Ingress('k8s-dashboard-ingress', {
            metadata: {
                name: 'k8s-dashboard-ingress',
                namespace: monitoringNs.metadata.name,
                annotations: {
                    'nginx.ingress.kubernetes.io/rewrite-target': '/$2',
                    'kubernetes.io/ingress.class': 'nginx',
                    'nginx.ingress.kubernetes.io/ssl-redirect': 'false',
                    'nginx.ingress.kubernetes.io/backend-protocol': 'HTTPS',
                    'nginx.ingress.kubernetes.io/proxy-body-size': '0',
                    'nginx.ingress.kubernetes.io/proxy-read-timeout': '600',
                    'nginx.ingress.kubernetes.io/proxy-send-timeout': '600',
                },
            },
            spec: {
                rules: [
                    {
                        host: 'conversation-app.local',
                        http: {
                            paths: [
                                {
                                    path: '/k8s-dashboard(/|$)(.*)',
                                    pathType: 'ImplementationSpecific',
                                    backend: {
                                        service: {
                                            name: stableK8sDashboardService.metadata.name,
                                            port: { number: 443 },
                                        },
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        }, { provider, dependsOn: [stableK8sDashboardService] });
    }
}

// Export important information
export const minioConsoleUrl = pulumi.interpolate`http://conversation-app.local/minio`;
export const minioApiUrl = pulumi.interpolate`http://conversation-app.local/minio-api`;
export const backendApiUrl = pulumi.interpolate`http://conversation-app.local/api`;
export const minioAdminUser = 'minio';
export const minioAdminPassword = minioPassword.result;
export const mongoAdminUser = 'admin';
export const mongoAdminPassword = mongoDbPassword.result;
export const namespaceName = namespace.metadata.name;

// Add monitoring URLs if enabled
export const grafanaUrl = enableMonitoring ? pulumi.interpolate`http://conversation-app.local/grafana` : undefined;
export const prometheusUrl = enableMonitoring ? pulumi.interpolate`http://conversation-app.local/prometheus` : undefined;
export const alertmanagerUrl = enableMonitoring ? pulumi.interpolate`http://conversation-app.local/alertmanager` : undefined;
export const k8sDashboardUrl = enableMonitoring ? pulumi.interpolate`http://conversation-app.local/k8s-dashboard` : undefined;

// Add hosts entry reminder
export const hostsEntryReminder = pulumi.interpolate`
Add this to your /etc/hosts file:
127.0.0.1 conversation-app.local
`;
