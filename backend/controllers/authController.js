import bcrypt from 'bcrypt'; // Import bcrypt for password hashing and comparison
import jwt from 'jsonwebtoken'; // Import JSON Web Token for authentication
import pool from '../config/dbConn.js'; // Import the database connection pool

// Function to handle user login
const handleLogin = async (req, res) => {
  const { user, pwd } = req.body; // Extract username and password from the request body

  // Validate that both username and password are provided
  if (!user || !pwd) {
    return res.status(400).json({ message: 'Username and password required.' }); // Return error if missing
  }

  try {
    // Query the database to find the user by username
    const query = 'SELECT * FROM users WHERE username = $1';
    const foundUser = await pool.query(query, [user]);

    // Check if the user exists
    if (foundUser.rows.length === 0) {
      return res.sendStatus(401); // Return unauthorized status if user not found
    }

    // Compare the provided password with the hashed password in the database
    const match = await bcrypt.compare(pwd, foundUser.rows[0].password);

    if (match) {
      // Create JWTs for authentication
      const accessToken = jwt.sign(
        { user: user, userId: foundUser.rows[0].id }, // Payload
        process.env.ACCESS_TOKEN_SECRET, // Secret key
        { expiresIn: '20m' } // Expiration time
      );
      const refreshToken = jwt.sign(
        { user: user, userId: foundUser.rows[0].id }, // Payload
        process.env.REFRESH_TOKEN_SECRET, // Secret key
        { expiresIn: '1d' } // Expiration time
      );

      // Store the refresh token in the database
      const updateQuery = 'UPDATE users SET refresh_token = $1 WHERE username = $2';
      await pool.query(updateQuery, [refreshToken, user]);

      // Send the refresh token as an HTTP-only cookie
      res.cookie('jwt', refreshToken, { 
        httpOnly: true, // Prevent access from JavaScript
        sameSite: 'None', // Allow cross-site requests
        secure: true, // Ensure cookie is sent over HTTPS
        maxAge: 24 * 60 * 60 * 1000 // Set expiration time to 1 day
      });

      // Respond with the access token
      res.json({ accessToken });
    } else {
      res.sendStatus(401); // Return unauthorized status if password does not match
    }
  } catch (error) {
    res.status(500).json({ message: error.message }); // Return error response if something goes wrong
  }
};

export default handleLogin; // Export the login handler function