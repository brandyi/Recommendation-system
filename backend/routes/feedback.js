import express from 'express';
import  handleFeedback  from '../controllers/feedbackController.js';
const router = express.Router();

router.post('/algorithm-preference', handleFeedback);

export default router;