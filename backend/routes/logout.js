import express from 'express'; // Import Express for routing
import handleLogout from '../controllers/logoutController.js'; // Import the logout controller

const router = express.Router(); // Create a new router instance

// Route to handle user logout
router.get('/', handleLogout);

export default router; // Export the router