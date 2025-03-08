import express from 'express';
import { uploadAudio, getAudioTranscript } from '../controllers/audioController';

const router = express.Router();

router.post('/audio-upload', uploadAudio);
router.get('/transcripts/:id', getAudioTranscript);

export default router;
