import pool from '../config/dbConn.js';

const handleLogout = async (req, res) => {
  // on client, delete access token

  const cookies = req.cookies;
  if (!cookies?.jwt) {
    return res.sendStatus(204);
  }
  const refreshToken = cookies.jwt;

  try {
    const query = 'SELECT * FROM users WHERE refresh_token = $1';
    const foundUser = await pool.query(query, [refreshToken]);
    if (foundUser.rows.length === 0) {
      res.clearCookie('jwt', { httpOnly: true, sameSite:true, secure:true});
      return res.sendStatus(204);
    }
    
    const updateQuery = 'UPDATE users SET refresh_token = NULL WHERE refresh_token = $1';
    await pool.query(updateQuery, [refreshToken]);
    res.clearCookie('jwt', { httpOnly: true, sameSite:true, secure:true}); 
    res.sendStatus(204);
  }
  catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export default handleLogout;