import pool from "../config/dbConn.js";
import { 
  getUserPreferences, 
  extractYear, 
  saveUserMoviePreferences 
} from '../utils/preferencesUtil.js';

export const getMovies = async (req, res) => {
  const userId = req.userId;

  try {
    const { preferredGenres, preferredYears} = await getUserPreferences(userId);
    
    if (!preferredGenres.length || !preferredYears.length) {
      return res.status(404).json({ message: "User preferences not found" });
    }
    
    const genreQuery = `
      SELECT *, 'preference' AS source 
      FROM movies 
      WHERE string_to_array(genres, '|') && $1::text[]
    `;
    const moviesResult = await pool.query(genreQuery, [preferredGenres]);
    
    const filteredMovies = moviesResult.rows.filter(movie => {
      const year = extractYear(movie.title);
      return year && preferredYears.includes(year);
    });
    
    await saveUserMoviePreferences(userId, filteredMovies);
    
    const shuffledPreferred = [...filteredMovies].sort(() => 0.5 - Math.random());
    const selectedPreferredMovies = shuffledPreferred.slice(0, 3).map(movie => ({
      ...movie,
      source: 'preference'
    }));
    
    const randomQuery = `SELECT *, 'random' AS source FROM movies ORDER BY RANDOM() LIMIT 2`;
    const randomMovies = await pool.query(randomQuery);
    
    const allMovies = [...selectedPreferredMovies, ...randomMovies.rows];
    res.status(200).json(allMovies);
    
  } catch (error) {
    console.error("Error in getMovies:", error);
    res.status(500).json({ message: "Error fetching movies." });
  }
};

export const getChanged = async (req, res) => {
  const userId = req.userId;
  const { movieId, source } = req.query;
  
  try {
    if (source === 'preference') {
      const preferredQuery = `SELECT * FROM temp_preferred_movies WHERE userid = $1 AND movieid != $2 ORDER BY RANDOM() LIMIT 1`;
      const preferredResult = await pool.query(preferredQuery, [userId, movieId]);
      
      if (preferredResult.rows.length) {
        return res.status(200).json({
          ...preferredResult.rows[0],
          source: 'preference'
        });
      }   
    }
    
    const randomQuery = `SELECT *, 'random' AS source FROM movies WHERE movieid != $1 ORDER BY RANDOM() LIMIT 1`;
    const randomResult = await pool.query(randomQuery, [movieId]);
    
    res.status(200).json(randomResult.rows[0]);
    
  } catch (error) {
    console.error("Error in getChanged:", error);
    res.status(500).json({ message: "Error changing movie." });
  }
};

export const rateMovies = async (req, res) => {
  const userId = req.userId;
  const ratings = req.body.ratings;
  
  try {
    await pool.query('BEGIN');
    
    const insertQuery = `
      INSERT INTO user_survey_ratings (userid, movieid, rating) 
      VALUES ($1, $2, $3)
      ON CONFLICT (userid, movieid) DO UPDATE SET rating = $3
    `;
    
    for (const [movieId, rating] of Object.entries(ratings)) {
      await pool.query(insertQuery, [userId, parseInt(movieId), rating]);
    }
    
    await pool.query('COMMIT');
    res.status(200).json({ message: "Ratings successfully saved." });
    
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error("Error in rateMovies:", error);
    res.status(500).json({ message: "Error saving ratings." });
  }
};

export const getLikedMovies = async (req, res) => {
  try {
    const userId = req.userId;
    
    const likedMovies = await pool.query(
      `SELECT m.movieid as "movieId", m.title, 
       EXTRACT(YEAR FROM TO_DATE(SUBSTRING(m.title FROM '\\(([0-9]{4})\\)'), 'YYYY')) as year
       FROM liked_movies lm
       JOIN movies m ON lm.movieid = m.movieid
       WHERE lm.userid = $1`,
      [userId]
    );
    
    res.json(likedMovies.rows);
  } catch (error) {
    console.error('Error fetching liked movies:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch liked movies',
      error: error.message
    });
  }
};

export const likeMovie = async (req, res) => {
  try {
    const userId = req.userId;
    const movieId = req.params.movieId;
    
    const movieExists = await pool.query(
      "SELECT 1 FROM movies WHERE movieid = $1",
      [movieId]
    );
    
    if (movieExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Movie with ID ${movieId} not found`
      });
    }
    
    const alreadyLiked = await pool.query(
      "SELECT 1 FROM liked_movies WHERE userid = $1 AND movieid = $2",
      [userId, movieId]
    );
    
    if (alreadyLiked.rows.length > 0) {
      return res.json({
        success: true,
        message: 'Movie already liked'
      });
    }
    
    await pool.query(
      "INSERT INTO liked_movies (userid, movieid) VALUES ($1, $2)",
      [userId, movieId]
    );
    
    res.json({
      success: true,
      message: 'Movie liked successfully'
    });
  } catch (error) {
    console.error('Error liking movie:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to like movie',
      error: error.message
    });
  }
};

export const unlikeMovie = async (req, res) => {
  try {
    const userId = req.userId;
    const movieId = req.params.movieId;
    
    await pool.query(
      "DELETE FROM liked_movies WHERE userid = $1 AND movieid = $2",
      [userId, movieId]
    );
    
    res.json({
      success: true,
      message: 'Movie unliked successfully'
    });
  } catch (error) {
    console.error('Error unliking movie:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unlike movie',
      error: error.message
    });
  }
};
