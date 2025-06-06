import jwt from 'jsonwebtoken'; // Import JSON Web Token for verifying tokens

// Middleware to verify JWT tokens for protected routes
const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization; // Extract the Authorization header

  // Validate that the Authorization header starts with 'Bearer '
  if (!authHeader?.startsWith('Bearer ')) {
    return res.sendStatus(401); // Unauthorized if the header is missing or invalid
  }

  const token = authHeader.split(' ')[1]; // Extract the token from the header

  // Verify the token using the secret key
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.sendStatus(403); // Forbidden if the token is invalid or expired
    }

    // Attach the decoded user information to the request object
    req.user = decoded.user; // Username
    req.userId = decoded.userId; // User ID

    next(); // Proceed to the next middleware or route handler
  });
};

export default verifyJWT; // Export the verifyJWT middleware