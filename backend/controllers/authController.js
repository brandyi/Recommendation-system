import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/dbConn.js';

const handleLogin = async (req, res) => {
  const { user, pwd } = req.body;
  if (!user || !pwd) {
    return res.status(400).json({ message: 'Username and password required.' });
  }
  try {
    const query = 'SELECT * FROM users WHERE username = $1';
    const foundUser = await pool.query(query, [user]);
    if (foundUser.rows.length === 0) {
      return res.sendStatus(401);
    }
    const match = await bcrypt.compare(pwd, foundUser.rows[0].password);
    if (match) {
      //create JWTs
      const accessToken = jwt.sign({ user: user }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
      const refreshToken = jwt.sign({ user: user }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '1d' });

      //store refresh token in db
      const updateQuery = 'UPDATE users SET refresh_token = $1 WHERE username = $2';
      await pool.query(updateQuery, [refreshToken, user]);

      res.cookie('jwt', refreshToken, { httpOnly: true, sameSite:'None', secure: true , maxAge: 24*60*60*1000 });
      res.json({ accessToken });
    }
    else{
      res.sendStatus(401);
    }
  }
  catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export default handleLogin;