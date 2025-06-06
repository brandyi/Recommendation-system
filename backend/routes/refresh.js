import express from 'express'; // Import Express for routing
import handleRefreshToken from '../controllers/refreshTokenController.js'; // Import the refresh token controller

const router = express.Router(); // Create a new router instance

// Route to handle refreshing the access token
router.get('/', handleRefreshToken);

export default router; // Export the router