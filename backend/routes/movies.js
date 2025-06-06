import express from 'express'; // Import Express for routing
import { 
  getMovies, // Controller to fetch movies based on user preferences
  getChanged, // Controller to replace a movie
  getMovieId, // Controller to fetch TMDB ID for a movie
  rateMovies, // Controller to save user ratings for movies
  getLikedMovies, // Controller to fetch liked movies
  likeMovie, // Controller to like a movie
  unlikeMovie, // Controller to unlike a movie
  deleteTemp, // Controller to delete temporary movies
  searchMovies // Controller to search movies
} from '../controllers/moviesController.js';

const router = express.Router(); // Create a new router instance

// Route to fetch movies based on user preferences
router.get('/', getMovies);

// Route to replace a movie
router.get('/change', getChanged);

// Route to fetch liked movies
router.get('/liked', getLikedMovies);

// Route to search movies
router.get('/search', searchMovies);

// Route to fetch TMDB ID for a movie
router.get('/:movieId', getMovieId);

// Route to save user ratings for movies
router.post('/rate', rateMovies);

// Route to like a movie
router.post('/like/:movieId', likeMovie);

// Route to unlike a movie
router.delete('/unlike/:movieId', unlikeMovie);

// Route to delete temporary movies
router.delete('/delete-temp', deleteTemp);

export default router; // Export the router