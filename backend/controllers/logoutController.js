import pool from '../config/dbConn.js'; // Import the database connection pool

// Function to handle user logout
const handleLogout = async (req, res) => {
  // On the client side, the access token should be deleted

  const cookies = req.cookies; // Extract cookies from the request
  if (!cookies?.jwt) {
    return res.sendStatus(204); // No content response if no JWT cookie is found
  }
  const refreshToken = cookies.jwt; // Extract the refresh token from the cookie

  try {
    // Query the database to find the user with the provided refresh token
    const query = 'SELECT * FROM users WHERE refresh_token = $1';
    const foundUser = await pool.query(query, [refreshToken]);

    // If no user is found, clear the cookie and return no content response
    if (foundUser.rows.length === 0) {
      res.clearCookie('jwt', { httpOnly: true, sameSite: true, secure: true }); // Clear the JWT cookie
      return res.sendStatus(204); // No content response
    }

    // Remove the refresh token from the database
    const updateQuery = 'UPDATE users SET refresh_token = NULL WHERE refresh_token = $1';
    await pool.query(updateQuery, [refreshToken]);

    // Clear the JWT cookie
    res.clearCookie('jwt', { httpOnly: true, sameSite: true, secure: true }); // Ensure cookie is cleared securely
    res.sendStatus(204); // No content response
  } catch (error) {
    res.status(500).json({ message: error.message }); // Return error response if something goes wrong
  }
};

export default handleLogout; // Export the logout handler function