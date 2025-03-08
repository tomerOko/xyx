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

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
});
