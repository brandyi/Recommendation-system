import bcrypt from 'bcrypt';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

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
      return res.status(200).json({ success: `User ${user} logged in successfully` });
    }
    else{
      return res.sendStatus(401);
    }
  }
  catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export default handleLogin;