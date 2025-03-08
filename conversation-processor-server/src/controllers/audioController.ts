import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { uploadToS3, getFromS3 } from '../services/s3Service';
import { transcribeAudio } from '../services/transcriptionService';
import { logger } from '../utils/logger';
import { ApiError } from '../middlewares/errorHandler';
import { AudioUploadRequest, TypedRequest } from '../types';

export const uploadAudio = async (
  req: TypedRequest<AudioUploadRequest>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { fileName, audioData, timestamp, metadata } = req.body;
    
    if (!audioData || !fileName) {
      throw new ApiError('Missing required audio data', 400);
    }
    
    // Convert base64 to buffer
    const buffer = Buffer.from(audioData, 'base64');
    
    // Generate unique ID for this recording
    const recordingId = uuidv4();
    
    // Log the upload (without the actual audio data for privacy)
    logger.info(`Received audio upload: ${fileName} from ${metadata?.deviceInfo?.platform || 'unknown device'}`);
    
    // Upload to S3
    const s3Key = `recordings/${recordingId}/${fileName}`;
    await uploadToS3(buffer, s3Key, 'audio/wav');
    
    // Start transcription process
    const transcriptionJob = await transcribeAudio(s3Key, recordingId);
    
    res.status(200).json({
      success: true,
      recordingId,
      message: 'Audio uploaded successfully',
      transcriptionJobId: transcriptionJob.id
    });
  } catch (error) {
    logger.error('Error in uploadAudio:', error);
    next(error);
  }
};

export const getAudioTranscript = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!id) {
      throw new ApiError('Missing recording ID', 400);
    }
    
    logger.info(`Fetching transcript for recording: ${id}`);
    
    // Check if transcript exists in S3
    const transcriptKey = `transcripts/${id}.json`;
    
    try {
      const transcript = await getFromS3(transcriptKey);
      res.status(200).json({
        recordingId: id,
        transcript: JSON.parse(transcript.toString())
      });
    } catch (error) {
      // If transcript not found, check if it's still processing
      logger.warn(`Transcript not found for recording: ${id}`);
      
      res.status(404).json({
        error: 'Transcript not found or still processing',
        recordingId: id
      });
    }
  } catch (error) {
    logger.error('Error in getAudioTranscript:', error);
    next(error);
  }
};

export const echoRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    logger.info('Echo request received');
    
    res.status(200).json({
      message: 'Echo endpoint',
      timestamp: new Date().toISOString(),
      body: req.body,
      headers: req.headers
    });
  } catch (error) {
    logger.error('Error in echoRequest:', error);
    next(error);
  }
};
