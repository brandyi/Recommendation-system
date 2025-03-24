import express from 'express';
import  handleAnswers  from '../controllers/answersController.js';
const router = express.Router();

router.post('/', handleAnswers);

export default router;