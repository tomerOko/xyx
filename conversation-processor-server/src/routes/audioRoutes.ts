import express from 'express';
import { uploadAudio, getAudioTranscript, echoRequest } from '../controllers/audioController';

const router = express.Router();

router.post('/audio-upload', uploadAudio);
router.get('/transcripts/:id', getAudioTranscript);
// router.post('/echo', echoRequest);

// Test endpoint for curl testing
router.get('/test', (req, res) => {
  res.status(200).json({
    message: 'Audio routes test endpoint is working',
    timestamp: new Date().toISOString(),
    query: req.query,
    headers: req.headers
  });
});

export default router;
