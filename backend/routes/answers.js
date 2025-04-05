import express from 'express';
import  {handleAnswers, checkAnswers}  from '../controllers/answersController.js';
const router = express.Router();

router.route('/').post(handleAnswers).get(checkAnswers);

export default router;