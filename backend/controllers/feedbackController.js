import pool from "../config/dbConn.js"; // Import the database connection pool

// Function to handle feedback submission
export const handleFeedback = async (req, res) => {
  try {
    const { preferred_algorithm, ncf_movies_ids, cf_movies_ids } = req.body; // Extract feedback data from the request body

    // Validate that all required feedback data is provided
    if (!preferred_algorithm || !ncf_movies_ids || !cf_movies_ids) {
      return res.status(400).json({ message: "Missing required feedback data" }); // Return error if data is missing
    }

    // Process each movie pair
    for (let i = 0; i < ncf_movies_ids.length; i++) {
      const ncf_movie_id = ncf_movies_ids[i];
      const cf_movie_id = cf_movies_ids[i];

      // Check if a record already exists for this user and movie pair
      const existingRecord = await pool.query(
        "SELECT id FROM feedback WHERE user_id = $1 AND ncf_movie_id = $2 AND cf_movie_id = $3",
        [req.userId, ncf_movie_id, cf_movie_id]
      );

      if (existingRecord.rows.length > 0) {
        // Update only the preferred_algorithm field if the record exists
        const feedbackId = existingRecord.rows[0].id;
        await pool.query(
          "UPDATE feedback SET preferred_algorithm = $1 WHERE id = $2",
          [preferred_algorithm, feedbackId]
        );
      } else {
        // Insert a new record with preferred_algorithm if no record exists
        await pool.query(
          "INSERT INTO feedback (user_id, preferred_algorithm, ncf_movie_id, cf_movie_id) VALUES ($1, $2, $3, $4)",
          [req.userId, preferred_algorithm, ncf_movie_id, cf_movie_id]
        );
      }
    }

    res.status(201).json({ message: "Feedback submitted successfully" }); // Return success response
  } catch (error) {
    console.error("Error submitting feedback:", error); // Log error for debugging
    res.status(500).json({ message: "Server error saving preference" }); // Return error response
  }
};

// Function to check if the user has voted
export const handleVoted = async (req, res) => {
  try {
    const userId = req.userId; // Extract user ID from the request
    const query = `SELECT * FROM feedback WHERE user_id = $1`; // Query to check feedback records

    const responese = await pool.query(query, [userId]);

    // Return whether the user has voted based on the query result
    if (responese.rows.length > 0) {
      return res.json({ voted: true });
    } else {
      return res.json({ voted: false });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error checking feedback" }); // Return error response
  }
};

// Function to rate movies
export const rateMovie = async (req, res) => {
  try {
    const { ncf_movie_id, cf_movie_id, movie_rating_ncf, movie_rating_cf } = req.body; // Extract rating data from the request body
    const userId = req.userId; // Extract user ID from the request

    // Check if a feedback record exists for this movie pair
    const existingFeedback = await pool.query(
      "SELECT id FROM feedback WHERE user_id = $1 AND ncf_movie_id = $2 AND cf_movie_id = $3",
      [userId, ncf_movie_id, cf_movie_id]
    );

    if (existingFeedback.rows.length > 0) {
      // Update existing record with provided ratings
      const feedbackId = existingFeedback.rows[0].id;

      if (movie_rating_ncf !== null) {
        await pool.query(
          "UPDATE feedback SET movie_rating_ncf = $1 WHERE id = $2",
          [movie_rating_ncf, feedbackId]
        );
      }

      if (movie_rating_cf !== null) {
        await pool.query(
          "UPDATE feedback SET movie_rating_cf = $1 WHERE id = $2",
          [movie_rating_cf, feedbackId]
        );
      }
    } else {
      // Insert a new record with ratings and default preferred_algorithm
      await pool.query(
        "INSERT INTO feedback (user_id, ncf_movie_id, cf_movie_id, movie_rating_ncf, movie_rating_cf, preferred_algorithm) VALUES ($1, $2, $3, $4, $5, $6)",
        [userId, ncf_movie_id, cf_movie_id, movie_rating_ncf, movie_rating_cf, "unrated"]
      );
    }

    res.status(200).json({ success: true }); // Return success response
  } catch (err) {
    console.error(err); // Log error for debugging
    res.status(500).json({ message: "Server error" }); // Return error response
  }
};

// Function to get all movie ratings for the user
export const getMovieRatings = async (req, res) => {
  try {
    const userId = req.userId; // Extract user ID from the request

    // Query to fetch movie ratings for the user
    const ratings = await pool.query(
      "SELECT ncf_movie_id, cf_movie_id, movie_rating_ncf, movie_rating_cf FROM feedback WHERE user_id = $1",
      [userId]
    );

    res.status(200).json(ratings.rows); // Return the ratings
  } catch (err) {
    console.error(err); // Log error for debugging
    res.status(500).json({ message: "Server error" }); // Return error response
  }
};
