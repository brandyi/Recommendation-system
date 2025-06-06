import jwt from 'jsonwebtoken'; // Import JSON Web Token for authentication
import pool from '../config/dbConn.js'; // Import the database connection pool


// Function to handle refresh token and issue a new access token
const handleRefreshToken = async (req, res) => {
  const cookies = req.cookies; // Extract cookies from the request

  // Validate that the refresh token cookie exists
  if (!cookies?.jwt) {
    return res.sendStatus(401); // Unauthorized if no refresh token is provided
  }
  const refreshToken = cookies.jwt; // Extract the refresh token from the cookie

  try {
    // Query the database to find the user with the provided refresh token
    const query = 'SELECT * FROM users WHERE refresh_token = $1';
    const foundUser = await pool.query(query, [refreshToken]);

    // Validate that the user exists
    if (foundUser.rows.length === 0) {
      return res.sendStatus(403); // Forbidden if no user is found
    }

    // Verify the refresh token
    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
      // Check for errors or mismatched username
      if (err || foundUser.rows[0].username !== decoded.user) {
        return res.sendStatus(403); // Forbidden if verification fails
      }

      // Generate a new access token
      const accessToken = jwt.sign(
        {
          user: decoded.user, // Include username in the payload
          userId: decoded.userId, // Include user ID in the payload
        },
        process.env.ACCESS_TOKEN_SECRET, // Secret key for signing the token
        { expiresIn: '15m' } // Set expiration time for the access token
      );

      // Respond with the new access token
      res.json({ accessToken });
    });
  } catch (error) {
    res.status(500).json({ message: error.message }); // Return error response if something goes wrong
  }
};

export default handleRefreshToken; // Export the refresh token handler function