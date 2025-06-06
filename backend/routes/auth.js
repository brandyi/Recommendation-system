import express from 'express'; // Import Express for routing
import handleLogin from '../controllers/authController.js'; // Import the login controller

const router = express.Router(); // Create a new router instance

// Route to handle user login
router.post('/', handleLogin);

export default router; // Export the router