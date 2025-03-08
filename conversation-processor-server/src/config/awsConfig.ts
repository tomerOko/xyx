import AWS from 'aws-sdk';
import { logger } from '../utils/logger';

export const configureAWS = (): void => {
  try {
    const s3Config: AWS.S3.ClientConfiguration = {
      region: process.env.AWS_REGION,
    };
    
    // For local development with localstack
    if (process.env.NODE_ENV === 'development' && process.env.S3_ENDPOINT) {
      s3Config.endpoint = process.env.S3_ENDPOINT;
      s3Config.s3ForcePathStyle = true;
      logger.info(`Using local S3 endpoint: ${process.env.S3_ENDPOINT}`);
    }
    
    // Configure AWS SDK
    AWS.config.update({
      region: process.env.AWS_REGION,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    });
    
    logger.info('AWS SDK configured successfully');
  } catch (error) {
    logger.error('Failed to configure AWS SDK:', error);
    throw error;
  }
};
