import express from 'express'; // Import Express for routing
import handleNewUser from '../controllers/registerController.js'; // Import the registration controller

const router = express.Router(); // Create a new router instance

// Route to handle user registration
router.post('/', handleNewUser);

export default router; // Export the router
