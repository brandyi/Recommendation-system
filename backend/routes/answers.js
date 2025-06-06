import express from 'express'; // Import Express for routing
import { handleAnswers, checkAnswers } from '../controllers/answersController.js'; // Import the answers controller

const router = express.Router(); // Create a new router instance

// Route to handle submission of answers and check if answers exist
router.route('/')
  .post(handleAnswers) // Submit answers
  .get(checkAnswers); // Check if answers exist

export default router; // Export the router