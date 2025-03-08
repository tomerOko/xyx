import express from 'express';
import { uploadAudio, getAudioTranscript, echoRequest } from '../controllers/audioController';

const router = express.Router();

router.post('/audio-upload', uploadAudio);
router.get('/transcripts/:id', getAudioTranscript);
router.post('/echo', echoRequest);

export default router;
