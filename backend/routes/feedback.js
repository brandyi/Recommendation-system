import express from 'express'; // Import Express for routing
import { 
  handleFeedback, // Controller to handle feedback submission
  handleVoted, // Controller to check if the user has voted
  rateMovie, // Controller to rate a movie
  getMovieRatings // Controller to fetch movie ratings
} from '../controllers/feedbackController.js';

const router = express.Router(); // Create a new router instance

// Route to submit algorithm preference feedback
router.post('/algorithm-preference', handleFeedback);

// Route to check if the user has voted
router.get('/voted', handleVoted);

// Route to rate a movie
router.post('/rate-movie', rateMovie);

// Route to fetch movie ratings
router.get('/movie-ratings', getMovieRatings);

export default router; // Export the router