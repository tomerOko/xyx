import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import * as docker from '@pulumi/docker';
import * as random from '@pulumi/random';

// Configuration
const config = new pulumi.Config();
const appName = 'conversation-app';
const appLabels = { app: appName };

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
                    image: 'conversation-processor-server:latest',
                    imagePullPolicy: 'IfNotPresent',
                    ports: [{ containerPort: 3000 }],
                    envFrom: [{
                        configMapRef: { name: backendConfigMap.metadata.name },
                    }],
                    readinessProbe: {
                        httpGet: {
                            path: '/health',
                            port: 3000,
                        },
                        initialDelaySeconds: 10,
                        periodSeconds: 5,
                    },
                    livenessProbe: {
                        httpGet: {
                            path: '/health',
                            port: 3000,
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
        ports: [{ port: 3000, targetPort: 3000 }],
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

// Export important information
export const minioConsoleUrl = pulumi.interpolate`http://conversation-app.local/minio`;
export const minioApiUrl = pulumi.interpolate`http://conversation-app.local/minio-api`;
export const backendApiUrl = pulumi.interpolate`http://conversation-app.local/api`;
export const minioAdminUser = 'minio';
export const minioAdminPassword = minioPassword.result;
export const mongoAdminUser = 'admin';
export const mongoAdminPassword = mongoDbPassword.result;
export const namespaceName = namespace.metadata.name;

// Add hosts entry reminder
export const hostsEntryReminder = pulumi.interpolate`
Add this to your /etc/hosts file:
127.0.0.1 conversation-app.local
`;
