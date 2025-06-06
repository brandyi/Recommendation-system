import allowedOrigins from '../config/allowedOrigins.js'; // Import the list of allowed origins for CORS

// Middleware to handle credentials for CORS
const credentials = (req, res, next) => {
  const origin = req.headers.origin; // Extract the origin of the request

  // Check if the origin is in the allowed origins list
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin); // Set the Access-Control-Allow-Origin header
  }

  next(); // Proceed to the next middleware or route handler
};

export default credentials; // Export the credentials middleware