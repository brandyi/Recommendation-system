import pool from "../config/dbConn.js";

const handleFeedback = async (req, res) => {
  try {
    const { preferred_algorithm, ncf_movie_id, cf_movie_id } = req.body;

    if (!preferred_algorithm || !ncf_movie_id || !cf_movie_id) {
      return res
        .status(400)
        .json({ message: "Missing required feedback data" });
    }

    const query = `
      INSERT INTO feedback (user_id, preferred_algorithm, ncf_movie_id, cf_movie_id)
      VALUES ($1, $2, $3, $4)
    `;

    const values = [
      req.userId,
      preferred_algorithm,
      ncf_movie_id,
      cf_movie_id,
    ];

    await pool.query(query, values);

    res.status(201).json({ message: "Feedback submitted successfully" });
  } catch (error) {
    console.error("Error submitting feedback:", error);
    res.status(500).json({ message: "Server error saving preference" });
  }
};

export default handleFeedback;