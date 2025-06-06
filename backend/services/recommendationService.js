import { spawn } from 'child_process'; // Import spawn to execute child processes
import path from 'path'; // Import path for file path manipulation
import { fileURLToPath } from 'url'; // Import fileURLToPath for URL handling
import pool from "../config/dbConn.js"; // Import the database connection pool

// Get the current file and directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the Python recommendation script
const PYTHON_SCRIPT = path.join(__dirname, '../model/recommendations.py');

/**
 * Converts a decade range string into an array of individual years.
 * @param {string} decade - The decade range (e.g., "before 1990s", "1990s", "2000s", "2010s").
 * @returns {Array<number>} Array of years corresponding to the decade range.
 */
const getYearsFromDecade = (decade) => {
  switch (decade.toLowerCase()) {
    case "pred 1990s":
      return Array.from({ length: 1989 - 1920 + 1 }, (_, i) => 1920 + i); // 1920 to 1989
    case "1990s":
      return Array.from({ length: 1999 - 1990 + 1 }, (_, i) => 1990 + i); // 1990 to 1999
    case "2000s":
      return Array.from({ length: 2009 - 2000 + 1 }, (_, i) => 2000 + i); // 2000 to 2009
    case "2010s a novšie":
      return Array.from({ length: 2023 - 2010 + 1 }, (_, i) => 2010 + i); // 2010 to 2023
    default:
      throw new Error(`Unknown decade: ${decade}`); // Throw error for invalid input
  }
};

/**
 * Gets recommendations for a user.
 * @param {string} userId - The user ID.
 * @returns {Promise<Array>} Recommendations array.
 */
export const getRecommendations = async (userId) => {
  try {
    // Fetch user movie ratings from the database
    const userMovieRatings = await pool.query(
      "SELECT movieid, rating FROM user_survey_ratings WHERE userid = $1",
      [userId]
    );

    const userRatings = {};
    if (userMovieRatings.rows.length > 0) {
      userMovieRatings.rows.forEach(row => {
        userRatings[row.movieid] = row.rating; // Map movie IDs to ratings
      });
    }

    // Fetch user genre preferences from the database
    const userGenres = await pool.query(
      "SELECT answer FROM userpreferences WHERE userid = $1 AND questionid = 1",
      [userId]
    );

    const genrePreferences = [];
    if (userGenres.rows.length > 0) {
      userGenres.rows.forEach(row => {
        const genres = row.answer.split('|').map(genre => genre.trim()); // Split and trim genres
        genrePreferences.push(...genres);
      });
    }

    // Fetch user decade preferences from the database
    const userDecade = await pool.query(
      "SELECT answer FROM userpreferences WHERE userid = $1 AND questionid = 2",
      [userId]
    );

    const decadePreferences = getYearsFromDecade(userDecade.rows[0].answer); // Convert decade to years

    // Run the Python recommendation script
    return await runPythonRecommendations(userId, userRatings, genrePreferences, decadePreferences);
  } catch (error) {
    console.error('Error getting recommendations:', error); // Log error for debugging
    throw error; // Rethrow the error
  }
};

/**
 * Runs the Python recommendation script.
 * @param {string} userId - User ID.
 * @param {Object} userRatings - Optional ratings object.
 * @param {Array} genrePreferences - Optional genre preferences.
 * @param {Array} decadePreferences - Optional decade preferences.
 * @returns {Promise<Array>} Recommendations.
 */
const runPythonRecommendations = (userId, userRatings = {}, genrePreferences = [], decadePreferences = []) => {
  return new Promise((resolve, reject) => {
    const args = [PYTHON_SCRIPT]; // Initialize arguments with the script path

    // Add user ratings or user ID to the arguments
    if (Object.keys(userRatings).length > 0) {
      args.push('--ratings', JSON.stringify(userRatings));
    } else if (userId) {
      args.push('--user_id', userId.toString());
    } else {
      return reject(new Error('No user ID or ratings available')); // Reject if neither is provided
    }

    // Add genre preferences to the arguments
    if (genrePreferences.length > 0) {
      args.push('--genres', JSON.stringify(genrePreferences));
    }

    // Add decade preferences to the arguments
    if (decadePreferences.length > 0) {
      args.push('--decade', JSON.stringify(decadePreferences));
    }

    // Spawn the Python process
    const pythonProcess = spawn('python', args);

    let result = ''; // Variable to store stdout data
    let error = ''; // Variable to store stderr data

    // Collect stdout data
    pythonProcess.stdout.on('data', (data) => {
      result += data.toString();
    });

    // Collect stderr data and log errors
    pythonProcess.stderr.on('data', (data) => {
      error += data.toString();
      console.error('Python error:', error);
    });

    // Handle process close event
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Python process exited with code ${code}: ${error}`)); // Reject if process fails
      }

      try {
        const cleanedResult = result.trim(); // Trim the result
        const recommendations = JSON.parse(cleanedResult); // Parse JSON output
        if (recommendations.error) {
          return reject(new Error(recommendations.error)); // Reject if error exists in output
        }
        resolve(recommendations); // Resolve with recommendations
      } catch (err) {
        reject(new Error(`Failed to parse Python output: ${err.message}`)); // Reject if parsing fails
      }
    });
  });
};

export default { getRecommendations }; // Export the recommendation service