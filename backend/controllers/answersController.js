import pool from '../config/dbConn.js';

const handleAnswers = async (req, res) => {
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

export default handleAnswers;