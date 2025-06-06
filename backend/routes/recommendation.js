import express from 'express'; // Import Express for routing
import { getRecommendations } from '../controllers/recommendationController.js'; // Import the recommendation controller

const router = express.Router(); // Create a new router instance

// Route to handle fetching recommendations
router.post('/', getRecommendations);

export default router; // Export the router