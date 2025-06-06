import bcrypt from 'bcrypt'; // Import bcrypt for password hashing
import pool from '../config/dbConn.js'; // Import the database connection pool

// Function to handle new user registration
const handleNewUser = async (req, res) => {
  const { user, pwd } = req.body; // Extract username and password from the request body

  // Validate that both username and password are provided
  if (!user || !pwd) {
    return res.status(400).json({ message: 'Username and password required.' }); // Return error if missing
  }

  try {
    // Check if the username already exists in the database
    const checkQuery = 'SELECT * FROM users WHERE username = $1';
    const checkResult = await pool.query(checkQuery, [user]);

    // If the username exists, return conflict status
    if (checkResult.rows.length > 0) {
      return res.sendStatus(409); // Conflict status
    }

    try {
      // Hash the password using bcrypt
      const hashedPwd = await bcrypt.hash(pwd, 10);

      // Insert the new user into the database
      const insertQuery = 'INSERT INTO users (username, password) VALUES ($1, $2)';
      await pool.query(insertQuery, [user, hashedPwd]);

      // Return success response
      res.status(201).json({ success: `User ${user} created.` });
    } catch (error) {
      res.status(500).json({ message: error.message }); // Return error response if insertion fails
    }
  } catch (error) {
    res.status(500).json({ message: error.message }); // Return error response if query fails
  }
};

export default handleNewUser; // Export the registration handler function