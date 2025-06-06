// Import necessary modules and middleware
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import corsOptions from './config/corsOptions.js'; // CORS configuration
import registerRouter from './routes/register.js'; // Routes for user registration
import loginRouter from './routes/auth.js'; // Routes for user authentication
import verifyJWT from './middleware/verifyJWT.js'; // Middleware to verify JWT tokens
import refreshRouter from './routes/refresh.js'; // Routes for token refresh
import logoutRouter from './routes/logout.js'; // Routes for user logout
import credentials from './middleware/credentials.js'; // Middleware to handle credentials
import answersRouter from './routes/answers.js'; // Routes for handling answers
import moviesRouter from './routes/movies.js'; // Routes for movie-related operations
import recommendationRouter from './routes/recommendation.js'; // Routes for recommendations
import feedbackRouter from './routes/feedback.js'; // Routes for feedback submission
import pool from './config/dbConn.js'; // Database connection pool


// Initialize the Express application
const app = express();
const port = process.env.PORT; // Port number from environment variables

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err); // Log error if connection fails
  } else {
    console.log('✅ Database connected successfully! Time:', res.rows[0].now); // Log success message
  }
});

// Middleware setup
app.use(credentials); // Handle credentials for CORS
app.use(cors(corsOptions)); // Enable CORS with specified options
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded data
app.use(express.json()); // Parse JSON data
app.use(cookieParser()); // Parse cookies

// Route setup for public endpoints
app.use('/register', registerRouter); // User registration
app.use('/auth', loginRouter); // User authentication
app.use('/refresh', refreshRouter); // Token refresh
app.use('/logout', logoutRouter); // User logout

// Middleware to protect routes
app.use(verifyJWT); // Verify JWT for protected routes

// Route setup for protected endpoints
app.use('/answers', answersRouter); // Handle answers
app.use("/movies", moviesRouter); // Movie-related operations
app.use("/recommendations", recommendationRouter); // Recommendations
app.use('/feedback', feedbackRouter); // Feedback submission


// Start the server
app.listen(port, () => {
  console.log(`Server is running on ${port}`); // Log server start message
});

