import { Request } from 'express';

export interface AudioUploadRequest {
  fileName: string;
  audioData: string; // base64 encoded
  timestamp: string;
  metadata: {
    deviceInfo: {
      platform: string;
      [key: string]: any;
    };
    [key: string]: any;
  };
}

export interface TranscriptionJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
}

export interface TranscriptionResult {
  text: string;
  confidence: number;
  segments: Array<{
    start: number;
    end: number;
    text: string;
  }>;
}

export interface ErrorResponse {
  message: string;
  status: number;
  timestamp: string;
  path?: string;
}

export interface TypedRequest<T> extends Request {
  body: T;
}
