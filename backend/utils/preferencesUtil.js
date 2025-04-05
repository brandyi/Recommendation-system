import pool from '../config/dbConn.js';


export const extractYear = (title) => {
  const match = title.match(/\((\d{4})\)/);
  return match ? parseInt(match[1], 10) : null;
};


export const parseYearPreference = (yearPref) => {
  const yearStr = yearPref.toString();
  let minYear, maxYear;
  
  if (yearStr.toLowerCase().includes("before")) {
    const decadeYear = parseInt(yearStr.match(/\d+/)[0], 10);
    minYear = 0;
    maxYear = decadeYear - 1;
  } else {
    const decadeYear = parseInt(yearStr, 10);
    minYear = decadeYear;
    maxYear = decadeYear + 9;
  }
  
  return { minYear, maxYear };
};


export const getUserPreferences = async (userId) => {
  try {
    const preferencesQuery = `SELECT questionid, answer FROM userpreferences WHERE userid = $1`;
    const userPreferences = await pool.query(preferencesQuery, [userId]);
    
    if (!userPreferences.rows.length) {
      return { preferredGenres: [], preferredYears: []};
    }
    
    let preferredGenres = [];
    let preferredYears = [];
    
    const preferences = userPreferences.rows.map(row => ({
      ...row,
      answer: row.answer.includes("|") 
        ? row.answer.split("|").map(item => item.trim())
        : [row.answer.trim()]
    }));
    
    if (preferences.length > 0 && preferences[0].questionid === 1) {
      preferredGenres = preferences[0].answer;
    }
    
    if (preferences.length > 1 && preferences[1].questionid === 2) {
      const { minYear, maxYear } = parseYearPreference(preferences[1].answer[0]);
      for (let year = minYear; year <= maxYear; year++) {
        preferredYears.push(year);
      }
    }
    
    return { 
      preferredGenres, 
      preferredYears, 
    };
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    return { preferredGenres: [], preferredYears: []};
  }
};


export const saveUserMoviePreferences = async (userId, preferredMovies) => {
  try {
    await pool.query('DELETE FROM temp_preferred_movies WHERE userid = $1', [userId]);
    
    if (!preferredMovies.length) return true;
    
    const values = preferredMovies.map(movie => 
      `(${userId}, ${movie.movieid}, '${movie.title.replace(/'/g, "''")}', '${movie.genres.replace(/'/g, "''")}')`
    ).join(', ');
    
    if (values.length > 0) {
      await pool.query(`
        INSERT INTO temp_preferred_movies (userid, movieid, title, genres)
        VALUES ${values}
      `);
    }
    return true;
  } catch (error) {
    console.error("Error saving user preferences:", error);
    return false;
  }
};