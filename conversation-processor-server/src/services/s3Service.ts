import AWS from 'aws-sdk';
import { logger } from '../utils/logger';
import { ApiError } from '../middlewares/errorHandler';

const bucketName = process.env.S3_BUCKET_NAME || 'conversation-recordings';

export const getS3Client = (): AWS.S3 => {
  const s3Config: AWS.S3.ClientConfiguration = {
    region: process.env.AWS_REGION,
  };
  
  // For local development with localstack
  if (process.env.NODE_ENV === 'development' && process.env.S3_ENDPOINT) {
    s3Config.endpoint = process.env.S3_ENDPOINT;
    s3Config.s3ForcePathStyle = true;
  }
  
  return new AWS.S3(s3Config);
};

export const uploadToS3 = async (
  fileBuffer: Buffer,
  key: string,
  contentType: string
): Promise<AWS.S3.ManagedUpload.SendData> => {
  const s3 = getS3Client();
  
  const params: AWS.S3.PutObjectRequest = {
    Bucket: bucketName,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType
  };
  
  try {
    const result = await s3.upload(params).promise();
    logger.info(`Successfully uploaded file to S3: ${key}`);
    return result;
  } catch (error) {
    logger.error(`Failed to upload file to S3: ${key}`, error);
    throw new ApiError('Failed to upload file to S3', 500);
  }
};

export const getFromS3 = async (key: string): Promise<Buffer> => {
  const s3 = getS3Client();
  
  const params: AWS.S3.GetObjectRequest = {
    Bucket: bucketName,
    Key: key
  };
  
  try {
    const data = await s3.getObject(params).promise();
    logger.info(`Successfully retrieved file from S3: ${key}`);
    return data.Body as Buffer;
  } catch (error) {
    logger.error(`Failed to retrieve file from S3: ${key}`, error);
    throw new ApiError('Failed to retrieve file from S3', 404);
  }
};
