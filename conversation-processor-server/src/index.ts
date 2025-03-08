import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import audioRoutes from './routes/audioRoutes';
import { errorHandler } from './middlewares/errorHandler';
import { configureAWS } from './config/awsConfig';

// Load environment variables
dotenv.config();

// Initialize AWS SDK
configureAWS();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));

// Routes
app.use('/api', audioRoutes);

// Test endpoint for curl testing (accessible directly)
app.get('/test', (req, res) => {
  res.status(200).json({
    message: 'Server is running correctly via /test',
    timestamp: new Date().toISOString(),
    query: req.query,
    headers: req.headers
  });
});

// New sync test endpoint
app.get('/sync-test', (req, res) => {
  res.status(200).json({
    message: 'Sync is working correctly!',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
  logger.info(`Test the server with: curl http://localhost:${port}/test`);
  logger.info(`Health check: curl http://localhost:${port}/health`);
  // Test comment to verify sync script is working
  // Second test comment after restarting sync script
});
