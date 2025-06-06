import pool from "../config/dbConn.js"; // Import the database connection pool

// Function to extract the year from a movie title
export const extractYear = (title) => {
  const match = title.match(/\((\d{4})\)/); // Match year in parentheses
  return match ? parseInt(match[1], 10) : null; // Return the year or null if not found
};

// Function to parse year preferences into a range of years
export const parseYearPreference = (yearPref) => {
  const yearStr = yearPref.toString();
  let minYear, maxYear;

  if (yearStr.toLowerCase().includes("pred")) {
    const decadeYear = parseInt(yearStr.match(/\d+/)[0], 10);
    minYear = 0;
    maxYear = decadeYear - 1; // Years before the specified decade
  } else if (yearStr.toLowerCase().includes("novšie")) {
    const decadeYear = parseInt(yearStr.match(/\d+/)[0], 10);
    minYear = decadeYear; // Years after the specified decade
    maxYear = 2023; // Current year
  } else {
    const decadeYear = parseInt(yearStr, 10);
    minYear = decadeYear; // Start of the decade
    maxYear = decadeYear + 9; // End of the decade
  }

  return { minYear, maxYear }; // Return the range of years
};

// Function to fetch user preferences from the database
export const getUserPreferences = async (userId) => {
  try {
    const preferencesQuery = `SELECT questionid, answer FROM userpreferences WHERE userid = $1`;
    const userPreferences = await pool.query(preferencesQuery, [userId]);

    // Return empty preferences if no data is found
    if (!userPreferences.rows.length) {
      return { preferredGenres: [], preferredYears: [] };
    }

    let preferredGenres = [];
    let preferredYears = [];

    // Parse preferences into structured data
    const preferences = userPreferences.rows.map((row) => ({
      ...row,
      answer: row.answer.includes("|")
        ? row.answer.split("|").map((item) => item.trim()) // Split and trim answers
        : [row.answer.trim()],
    }));

    for (const pref of preferences) {
      console.log(pref); // Log preferences for debugging
      if (pref.questionid === 1) {
        preferredGenres = pref.answer; // Extract genre preferences
      }

      if (pref.questionid === 2) {
        const { minYear, maxYear } = parseYearPreference(pref.answer[0]); // Parse year preferences
        for (let year = minYear; year <= maxYear; year++) {
          preferredYears.push(year); // Add years to the list
        }
      }
    }

    return {
      preferredGenres,
      preferredYears,
    };
  } catch (error) {
    console.error("Error fetching user preferences:", error); // Log error for debugging
    return { preferredGenres: [], preferredYears: [] }; // Return empty preferences on error
  }
};

// Function to save user movie preferences into the database
export const saveUserMoviePreferences = async (userId, preferredMovies) => {
  try {
    // Prepare values for insertion
    const values = preferredMovies
      .map(
        (movie) =>
          `(${userId}, ${movie.movieid}, '${movie.title.replace(
            /'/g,
            "''"
          )}', '${movie.genres.replace(/'/g, "''")}')` // Escape single quotes in data
      )
      .join(", ");

    // Insert values into the database if not empty
    if (values.length > 0) {
      await pool.query(`
        INSERT INTO temp_preferred_movies (userid, movieid, title, genres)
        VALUES ${values}
      `);
    }
    return true; // Return success
  } catch (error) {
    console.error("Error saving user preferences:", error); // Log error for debugging
    return false; // Return failure
  }
};

// Mapping of genres to TMDB genre IDs
export const tmdbGenreMap = {
  'Action': 28,
  'Adventure': 12,
  'Animation': 16,
  'Comedy': 35,
  'Crime': 80,
  'Documentary': 99,
  'Drama': 18,
  'Fantasy': 14,
  'History': 36,
  'Horror': 27,
  'Musical': 10402,
  'Mystery': 9648,
  'Romance': 10749,
  'Sci-Fi': 878,
  'Thriller': 53,
  'War': 10752,
  'Western': 37,
};
