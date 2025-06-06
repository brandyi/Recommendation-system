import pool from '../config/dbConn.js'; // Import the database connection pool

// Function to handle submission of answers
export const handleAnswers = async (req, res) => {
  const answers = req.body.answers; // Extract answers from the request body
  const userId = req.userId; // Extract user ID from the request (assumed to be set by middleware)

  // Validate that answers are provided
  if (!answers) {
    return res.status(400).json({ message: 'Answers required.' }); // Return error if answers are missing
  }

  try {
    // Prepare queries to insert answers into the database
    const queries = Object.entries(answers).map(([questionId, answer]) => {
      return pool.query(
        'INSERT INTO userpreferences (userid, questionid, answer) VALUES ($1, $2, $3)', // SQL query to insert answers
        [userId, questionId, Array.isArray(answer) ? answer.join(' | ') : answer] // Handle array answers by joining them
      );
    });

    await Promise.all(queries); // Execute all queries concurrently
    res.status(201).json({ message: 'Answers submitted successfully.' }); // Return success response
  } catch (error) {
    res.status(500).json({ message: 'Failed to save answers.' }); // Return error response if queries fail
  }
};

// Function to check if the user has submitted answers
export const checkAnswers = async (req, res) => {
  const userId = req.userId; // Extract user ID from the request

  try {
    // Query to check if the user has filled the survey
    const queryUPS = "SELECT * FROM userpreferences WHERE userid = $1";
    const userPreferencesSurvey = await pool.query(queryUPS, [userId]);
    const filledSurvey = userPreferencesSurvey.rowCount > 0; // Check if survey data exists

    // Query to check if the user has filled ratings
    const queryUPR = "SELECT * FROM user_survey_ratings WHERE userid = $1";
    const userPreferencesRatings = await pool.query(queryUPR, [userId]);
    const filledRatings = userPreferencesRatings.rowCount > 0; // Check if ratings data exists

    // Combine results into an object
    const filled = { filledSurvey, filledRatings };

    res.status(200).json(filled); // Return the results
  } catch (error) {
    res.status(500).json({ message: "Error fetching answers." }); // Return error response if queries fail
  }
};
