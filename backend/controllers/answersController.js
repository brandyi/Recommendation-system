import pool from '../config/dbConn.js';

export const handleAnswers = async (req, res) => {
  const answers = req.body.answers;
  const userId = req.userId;
  if (!answers) {
    return res.status(400).json({ message: 'Answers required.' });
  }

  try {
    const queries = Object.entries(answers).map(([questionId, answer]) => {
      return pool.query(
        'INSERT INTO userpreferences (userid, questionid, answer) VALUES ($1, $2, $3)',
        [userId, questionId, Array.isArray(answer) ? answer.join(' | ') : answer]
      );
    });

    await Promise.all(queries);
    res.status(201).json({ message: 'Answers submitted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to save answers.' });
  }
};

export const checkAnswers = async (req, res) => {
  const userId = req.userId;
  try{
    const queryUPS = "SELECT * FROM userpreferences WHERE userid = $1";
    const userPreferencesSurvey = await pool.query(queryUPS, [userId]);
    const filledSurvey = userPreferencesSurvey.rowCount > 0;

    const queryUPR = "SELECT * FROM user_survey_ratings WHERE userid = $1";
    const userPreferencesRatings = await pool.query(queryUPR, [userId]);
    const filledRatings = userPreferencesRatings.rowCount > 0;

    const filled = {filledSurvey, filledRatings};

    res.status(200).json(filled);
  } catch (error) {
    res.status(500).json({ message: "Error fetching answers." });
  }
};
