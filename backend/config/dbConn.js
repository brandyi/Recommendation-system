// Import the PostgreSQL client library
import pg from 'pg';
// Import dotenv to load environment variables from a .env file
import dotenv from 'dotenv';

// Load environment variables from the .env file
dotenv.config();

// Create a connection pool for PostgreSQL using environment variables
const pool = new pg.Pool({
  user: process.env.DB_USER, // Database username
  host: process.env.DB_HOST, // Database host
  database: process.env.DB_NAME, // Database name
  password: process.env.DB_PASSWORD, // Database password
  port: process.env.DB_PORT, // Database port
});

// Export the connection pool for use in other parts of the application
export default pool;