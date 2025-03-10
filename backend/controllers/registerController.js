import bcrypt from 'bcrypt';
import pool from '../config/dbConn.js';

const handleNewUser = async (req, res) => {
  const { user, pwd } = req.body;
  if (!user || !pwd) {
    return res.status(400).json({ message: 'Username and password required.' });
  }
  try {
    const checkQuery = 'SELECT * FROM users WHERE username = $1';
    const checkResult = await pool.query(checkQuery, [user]);
    if (checkResult.rows.length > 0) {
      return res.sendStatus(409);
    }
    try {
      const hashedPwd = await bcrypt.hash(pwd, 10);
      const insertQuery = 'INSERT INTO users (username, password) VALUES ($1, $2)';
      await pool.query(insertQuery, [user, hashedPwd]);
      res.status(201).json({ success: `User ${user} created.` });
    }
    catch (error) {
      res.status(500).json({ message: error.message });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export default handleNewUser;