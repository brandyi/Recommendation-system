import jwt from 'jsonwebtoken';
import pool from '../config/dbConn.js';


const handleRefreshToken = async (req, res) => {
  const cookies = req.cookies;
  if (!cookies?.jwt) {
    return res.sendStatus(401);
  }
  const refreshToken = cookies.jwt;
  try {
    const query = 'SELECT * FROM users WHERE refresh_token = $1';
    const foundUser = await pool.query(query, [refreshToken]);
    if (foundUser.rows.length === 0) {
      return res.sendStatus(403);
    }
    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
      if (err || foundUser.rows[0].username !== decoded.user) {
        return res.sendStatus(403);
      }
      const accessToken = jwt.sign({
        user: decoded.user, userId: decoded.userId 
      }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
      res.json({ accessToken });
    });
  }
  catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export default handleRefreshToken;