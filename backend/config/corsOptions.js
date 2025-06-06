// Import the list of allowed origins for CORS
import allowedOrigins from './allowedOrigins.js';

// Configuration object for CORS
const corsOptions = {
  // Function to check if the request's origin is allowed
  origin: function (origin, callback) {
    // Allow requests with no origin (e.g., mobile apps or Postman) or if the origin is in the whitelist
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true); // Allow the request
    } else {
      callback(new Error('Not allowed by CORS')); // Reject the request
    }
  },
  credentials: true // Enable credentials (cookies, authorization headers, etc.)
};

export default corsOptions;