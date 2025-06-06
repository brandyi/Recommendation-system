import axios from "axios"; // Import axios for making HTTP requests
import pool from "../config/dbConn.js"; // Import the database connection pool
import {
  getUserPreferences, // Utility function to fetch user preferences
  extractYear, // Utility function to extract year from movie title
  saveUserMoviePreferences, // Utility function to save user movie preferences
  tmdbGenreMap, // Mapping of genres to TMDB genre IDs
} from "../utils/preferencesUtil.js";

// Function to fetch movies based on user preferences
export const getMovies = async (req, res) => {
  const userId = req.userId; // Extract user ID from the request
  try {
    const { preferredGenres, preferredYears } = await getUserPreferences(userId); // Fetch user preferences

    // Validate that preferences exist
    if (!preferredGenres.length || !preferredYears.length) {
      return res.status(404).json({ message: "User preferences not found" });
    }

    console.log("User preferences:", preferredGenres, preferredYears);

    // Array to store our final movies
    let preferredMovies = [];
    let page = 1;
    const MAX_PAGES = 5; // Limit how many pages we'll check to avoid infinite loops

    // Get TMDB popular movies based on user preferences
    const tmdbGenreIds = preferredGenres
      .map((genre) => {
        if (tmdbGenreMap[genre]) {
          return tmdbGenreMap[genre];
        }
      })
      .filter((id) => id); // Filter out undefined values

    // Fetch movies from TMDB until we have enough or hit page limit
    while (preferredMovies.length < 15 && page <= MAX_PAGES) {
      const url = new URL("https://api.themoviedb.org/3/discover/movie");

      url.searchParams.append("language", "en-US");
      url.searchParams.append("sort_by", "popularity.desc");
      url.searchParams.append("vote_count.gte", 100);
      url.searchParams.append("with_genres", tmdbGenreIds.join("|"));
      url.searchParams.append(
        "primary_release_date.gte",
        `${preferredYears[0]}-01-01`
      );
      url.searchParams.append(
        "primary_release_date.lte",
        `${preferredYears[preferredYears.length - 1]}-12-31`
      );
      url.searchParams.append("page", page);

      console.log(`Fetching TMDB page ${page} for preferred movies...`);

      const response = await axios.get(url.toString(), {
        headers: {
          accept: "application/json",
          Authorization: "Bearer " + process.env.TMDB_API_TOKEN,
        },
      });

      if (!response.data.results || response.data.results.length === 0) {
        console.log("No more TMDB results available");
        break;
      }

      // Extract TMDB IDs to check against our database
      const tmdbIds = response.data.results.map((movie) => movie.id.toString());

      // Check which TMDB movies exist in our database
      const existingMoviesQuery = `
        SELECT m.*, l.tmdbid 
        FROM movies m
        JOIN links l ON m.movieid = l.movieid
        WHERE l.tmdbid = ANY($1)
      `;

      const existingMoviesResult = await pool.query(existingMoviesQuery, [
        tmdbIds,
      ]);

      // Create a map of TMDB IDs to our database records
      const tmdbToDbMap = {};
      existingMoviesResult.rows.forEach((movie) => {
        tmdbToDbMap[movie.tmdbid] = movie;
      });

      // Process TMDB results
      for (const tmdbMovie of response.data.results) {
        if (preferredMovies.length >= 15) break;

        // Check if this TMDB movie exists in our database
        if (tmdbToDbMap[tmdbMovie.id.toString()]) {
          // Use our database version with source property
          const dbMovie = tmdbToDbMap[tmdbMovie.id.toString()];
          preferredMovies.push({
            ...dbMovie,
            source: "preference",
          });
          console.log(
            `Added movie from database: ${dbMovie.title} (ID: ${dbMovie.movieid})`
          );
        }
      }
      page++;
    }

    console.log(
      `Found ${preferredMovies.length} preferred movies after TMDB search`
    );

    // If we still don't have enough movies, fall back to database query
    if (preferredMovies.length < 15) {
      console.log("Not enough movies from TMDB, adding from database...");

      // Get movies from database based on preferred genres and years
      const genreQuery = `
        SELECT *, 'preference' AS source 
        FROM movies 
        WHERE string_to_array(genres, '|') && $1::text[]
      `;
      const moviesResult = await pool.query(genreQuery, [preferredGenres]);

      const filteredMovies = moviesResult.rows.filter((movie) => {
        const year = extractYear(movie.title);
        return year && preferredYears.includes(year);
      });

      // Filter out movies we already have
      const existingIds = new Set(
        preferredMovies.map((m) => m.movieid.toString())
      );
      const additionalMovies = filteredMovies.filter(
        (movie) => !existingIds.has(movie.movieid.toString())
      );

      // Shuffle and take what we need
      const shuffled = [...additionalMovies].sort(() => 0.5 - Math.random());
      const needed = Math.max(0, 15 - preferredMovies.length);
      preferredMovies = [...preferredMovies, ...shuffled.slice(0, needed)];

      console.log(
        `Added ${Math.min(needed, shuffled.length)} more movies from database`
      );
    }

    // Ensure we have no more than 15 preferred movies
    const selectedPreferredMovies = preferredMovies.slice(0, 15);

    // Get popular movies from different genres than user preferences
    console.log("Getting popular movies from different genres...");

    // Get all available genre IDs
    const allGenreIds = Object.values(tmdbGenreMap);

    // Filter out the user's preferred genre IDs to get genres we want
    const preferredGenreIds = preferredGenres
      .map((genre) => tmdbGenreMap[genre])
      .filter((id) => id);

    // Create a set of genres to include (those not in preferred genres)
    const genresToInclude = allGenreIds.filter(
      (id) => !preferredGenreIds.includes(id)
    );

    console.log("Preferred genres excluded:", preferredGenres);
    console.log(
      "Genres to include for random movies:",
      Object.entries(tmdbGenreMap)
        .filter(([_, id]) => genresToInclude.includes(id))
        .map(([name]) => name)
    );

    // Keep track of our random movies and which pages we've checked
    let randomMovies = { rows: [] };
    let randomPage = 1;
    const MAX_RANDOM_PAGES = 5;

    // Try to get 5 movies from different genres
    while (randomMovies.rows.length < 5 && randomPage <= MAX_RANDOM_PAGES) {
      // Use discover instead of popular for better filtering
      const popularUrl = new URL("https://api.themoviedb.org/3/discover/movie");
      popularUrl.searchParams.append("language", "en-US");
      popularUrl.searchParams.append("sort_by", "popularity.desc");
      popularUrl.searchParams.append("vote_count.gte", 100);
      popularUrl.searchParams.append("with_genres", genresToInclude.join("|"));
      popularUrl.searchParams.append("page", randomPage);

      console.log(
        `Fetching TMDB popular page ${randomPage} for different genres...`
      );

      const popularResponse = await axios.get(popularUrl.toString(), {
        headers: {
          accept: "application/json",
          Authorization: "Bearer " + process.env.TMDB_API_TOKEN,
        },
      });

      if (
        !popularResponse.data.results ||
        popularResponse.data.results.length === 0
      ) {
        break;
      }

      // Filter for movies with different genres than the user's preferences
      const nonMatchingMovies = popularResponse.data.results.filter((movie) => {
        // If a movie has any genre NOT in the user's preferences, include it
        return !movie.genre_ids.some(
          (genreId) => preferredGenreIds.includes(genreId) // Use this variable instead
        );
      });

      console.log(
        `Found ${nonMatchingMovies.length} popular movies with different genres`
      );

      if (nonMatchingMovies.length === 0) {
        randomPage++;
        continue;
      }

      // Get TMDB IDs to check against our database
      const randomTmdbIds = nonMatchingMovies.map((movie) =>
        movie.id.toString()
      );

      // Find which of these exist in our database
      const randomExistingQuery = `
    SELECT m.*, l.tmdbid 
    FROM movies m
    JOIN links l ON m.movieid = l.movieid
    WHERE l.tmdbid = ANY($1)
  `;

      const randomExistingResult = await pool.query(randomExistingQuery, [
        randomTmdbIds,
      ]);

      // Map TMDB IDs to our database records
      const randomTmdbMap = {};
      randomExistingResult.rows.forEach((movie) => {
        randomTmdbMap[movie.tmdbid] = movie;
      });

      // Get database versions of these movies and mark as random
      for (const popularMovie of nonMatchingMovies) {
        if (randomMovies.rows.length >= 5) break;

        if (randomTmdbMap[popularMovie.id.toString()]) {
          const dbMovie = randomTmdbMap[popularMovie.id.toString()];
          randomMovies.rows.push({
            ...dbMovie,
            source: "random",
          });
          console.log(`Added different-genre movie: ${dbMovie.title}`);
        }
      }

      randomPage++;
    }

    // If we still don't have 5 random movies, fall back to database
    if (randomMovies.rows.length < 5) {
      const neededRandom = 5 - randomMovies.rows.length;
      console.log(
        `Still need ${neededRandom} more random movies, using database fallback`
      );

      // Get random movies from database that don't match preferred genres
      const fallbackQuery = `
    SELECT m.*, 'random' AS source 
    FROM movies m
    WHERE NOT (string_to_array(m.genres, '|') && $1::text[])
    AND NOT EXISTS (
      SELECT 1 FROM temp_preferred_movies tp
      WHERE tp.userid = $2 AND tp.movieid = m.movieid
    )
    ORDER BY RANDOM() 
    LIMIT $3
  `;

      const fallbackResult = await pool.query(fallbackQuery, [
        preferredGenres,
        userId,
        neededRandom,
      ]);

      randomMovies.rows = [...randomMovies.rows, ...fallbackResult.rows];
    }

    const allMovies = [...selectedPreferredMovies, ...randomMovies.rows];

    await saveUserMoviePreferences(userId, allMovies); // Save user movie preferences

    res.status(200).json(allMovies); // Return the movies
  } catch (error) {
    console.error("Error in getMovies:", error); // Log error for debugging
    res.status(500).json({ message: "Error fetching movies." }); // Return error response
  }
};

// Function to replace a movie with another based on user preferences or random selection
export const getChanged = async (req, res) => {
  const userId = req.userId; // Extract user ID from the request
  const { movieId, source } = req.query; // Extract movie ID and source from the query parameters

  try {
    // First try to get user preferences
    const { preferredGenres, preferredYears } = await getUserPreferences(
      userId
    );

    if (source === "preference") {
      // Only proceed with TMDB if we have preferences
      if (preferredGenres.length && preferredYears.length) {
        // Map genres to TMDB IDs
        const tmdbGenreIds = preferredGenres
          .map((genre) => {
            if (tmdbGenreMap[genre]) {
              return tmdbGenreMap[genre];
            }
          })
          .filter((id) => id);

        if (tmdbGenreIds.length) {
          for (let page = 1; page <= 10; page++) {
            const url = new URL("https://api.themoviedb.org/3/discover/movie");

            url.searchParams.append("language", "en-US");
            url.searchParams.append("sort_by", "popularity.desc");
            url.searchParams.append("vote_count.gte", 100);
            url.searchParams.append("with_genres", tmdbGenreIds.join("|"));
            url.searchParams.append(
              "primary_release_date.gte",
              `${preferredYears[0]}-01-01`
            );
            url.searchParams.append(
              "primary_release_date.lte",
              `${preferredYears[preferredYears.length - 1]}-12-31`
            );
            url.searchParams.append("page", page);

            console.log(`Fetching TMDB page ${page} for replacement movie...`);

            const response = await axios.get(url.toString(), {
              headers: {
                accept: "application/json",
                Authorization: "Bearer " + process.env.TMDB_API_TOKEN,
              },
            });

            if (response.data.results && response.data.results.length) {
              // Get all TMDB IDs from this page
              const tmdbIds = response.data.results.map((movie) =>
                movie.id.toString()
              );

              // Query database to find which TMDB movies exist in our DB
              const existingMoviesQuery = `
              SELECT m.*, l.tmdbid 
              FROM movies m
              JOIN links l ON m.movieid = l.movieid
              WHERE l.tmdbid = ANY($1)
            `;

              const existingMoviesResult = await pool.query(
                existingMoviesQuery,
                [tmdbIds]
              );

              const notSeenQuery = `
                SELECT tp.movieid  
                FROM temp_preferred_movies tp
                WHERE tp.userid = $1
              `;
              const notSeenResult = await pool.query(notSeenQuery, [userId]);

              // Create a Set of movie IDs the user has already seen for faster lookups
              const seenMovieIds = new Set();
              notSeenResult.rows.forEach((row) =>
                seenMovieIds.add(row.movieid.toString())
              );

              // Filter the existingMoviesResult to only include movies not already seen
              const availableMovies = existingMoviesResult.rows.filter(
                (movie) => !seenMovieIds.has(movie.movieid.toString())
              );

              console.log(
                `Found ${existingMoviesResult.rows.length} movies in database, ${availableMovies.length} not previously shown`
              );

              // If we have available movies, pick one randomly
              if (availableMovies.length > 0) {
                const randomIndex = Math.floor(
                  Math.random() * availableMovies.length
                );
                const selectedMovie = availableMovies[randomIndex];

                const movieToSave = {
                  ...selectedMovie,
                  source: source || "preference",
                };

                await saveUserMoviePreferences(userId, [movieToSave]);

                // Return with the appropriate source
                return res.status(200).json({
                  ...selectedMovie,
                  source: source || "preference", // Maintain the original source type
                });
              }
            }
          }
        }
      }

      console.log("TMDB approach failed, falling back to database query");

      // Find movies that match preferences but are NOT in the temp table
      const preferredQuery = `
        SELECT m.*, 'preference' AS source 
        FROM movies m
        JOIN links l ON m.movieid = l.movieid
        WHERE 
          -- Match genre preferences
          string_to_array(m.genres, '|') && $1::text[]
          -- Match year preferences 
          AND EXTRACT(YEAR FROM TO_DATE(SUBSTRING(m.title FROM '\\(([0-9]{4})\\)'), 'YYYY')) = ANY($2::int[])
          -- Not the current movie
          AND m.movieid != $3
          -- Not already seen (NOT IN temp table)
          AND NOT EXISTS (
            SELECT 1 FROM temp_preferred_movies tp
            WHERE tp.userid = $4 AND tp.movieid = m.movieid
          )
        ORDER BY RANDOM() 
        LIMIT 1
      `;

      const params = [preferredGenres, preferredYears, movieId, userId];

      const preferredResult = await pool.query(preferredQuery, params);

      const movieToSave = {
        ...preferredResult.rows[0],
        source: "preference",
      };
      await saveUserMoviePreferences(userId, [movieToSave]);

      if (preferredResult.rows.length) {
        return res.status(200).json({
          ...preferredResult.rows[0],
          source: "preference",
        });
      }
    } else {
      // Try TMDB popular movies first
      console.log("Getting popular movie for random replacement...");

      // Get all available genre IDs
      const allGenreIds = Object.values(tmdbGenreMap);

      // Filter out the user's preferred genre IDs to get genres we want
      const preferredGenreIds = preferredGenres
        .map((genre) => tmdbGenreMap[genre])
        .filter((id) => id);

      // Create a list of genres to include
      const genresToInclude = allGenreIds.filter(
        (id) => !preferredGenreIds.includes(id)
      );

      for (let page = 1; page <= 5; page++) {
        // Use discover instead of popular
        const popularUrl = new URL(
          "https://api.themoviedb.org/3/discover/movie"
        );
        popularUrl.searchParams.append("language", "en-US");
        popularUrl.searchParams.append("sort_by", "popularity.desc");
        popularUrl.searchParams.append("vote_count.gte", 100);
        popularUrl.searchParams.append(
          "with_genres",
          genresToInclude.join("|")
        );
        popularUrl.searchParams.append("page", page);

        console.log(
          `Fetching TMDB popular page ${page} for random replacement...`
        );

        const popularResponse = await axios.get(popularUrl.toString(), {
          headers: {
            accept: "application/json",
            Authorization: "Bearer " + process.env.TMDB_API_TOKEN,
          },
        });

        if (
          !popularResponse.data.results ||
          popularResponse.data.results.length === 0
        ) {
          break;
        }

        // Get all TMDB IDs from this page
        const tmdbIds = popularResponse.data.results.map((movie) =>
          movie.id.toString()
        );

        // Find which of these exist in our database
        const randomExistingQuery = `
          SELECT m.*, l.tmdbid 
          FROM movies m
          JOIN links l ON m.movieid = l.movieid
          WHERE l.tmdbid = ANY($1)
        `;

        const randomExistingResult = await pool.query(randomExistingQuery, [
          tmdbIds,
        ]);

        // Filter out movies that the user has already seen
        const notSeenQuery = `
          SELECT tp.movieid  
          FROM temp_preferred_movies tp
          WHERE tp.userid = $1
        `;
        const notSeenResult = await pool.query(notSeenQuery, [userId]);

        // Create a Set of movie IDs the user has already seen for faster lookups
        const seenMovieIds = new Set();
        notSeenResult.rows.forEach((row) =>
          seenMovieIds.add(row.movieid.toString())
        );

        // Also exclude the movie being replaced
        seenMovieIds.add(movieId.toString());

        // Filter to only include movies not already seen
        const availableMovies = randomExistingResult.rows.filter(
          (movie) => !seenMovieIds.has(movie.movieid.toString())
        );

        console.log(
          `Found ${randomExistingResult.rows.length} popular movies in database, ${availableMovies.length} not previously shown`
        );

        // If we have available movies, pick one randomly
        if (availableMovies.length > 0) {
          const randomIndex = Math.floor(
            Math.random() * availableMovies.length
          );
          const selectedMovie = availableMovies[randomIndex];

          console.log(`Selected popular movie: ${selectedMovie.title}`);

          // Save this movie to user's history
          const movieToSave = {
            ...selectedMovie,
            source: "random",
          };
          await saveUserMoviePreferences(userId, [movieToSave]);

          // Return with the random source
          return res.status(200).json({
            ...selectedMovie,
            source: "random",
          });
        }
      }

      // If TMDB approach fails, fall back to database query
      console.log(
        "TMDB popular approach failed, falling back to database random query"
      );

      const randomQuery = `
        SELECT *, 'random' AS source 
        FROM movies m
        WHERE m.movieid != $1
        AND NOT EXISTS (
          SELECT 1 FROM temp_preferred_movies tp
          WHERE tp.userid = $2 AND tp.movieid = m.movieid
        )
        ORDER BY RANDOM() 
        LIMIT 1
      `;

      const randomResult = await pool.query(randomQuery, [movieId, userId]);

      const movieToSave = {
        ...randomResult.rows[0],
        source: "random",
      };
      await saveUserMoviePreferences(userId, [movieToSave]);

      res.status(200).json(randomResult.rows[0]);
    }
  } catch (error) {
    console.error("Error in getChanged:", error); // Log error for debugging
    res.status(500).json({ message: "Error changing movie." }); // Return error response
  }
};

// Function to fetch TMDB ID for a given movie ID
export const getMovieId = async (req, res) => {
  const movieId = req.params.movieId; // Extract movie ID from the request parameters
  try {
    const movieResult = await pool.query(
      `SELECT * FROM links WHERE movieId = $1`,
      [movieId]
    );

    // Validate that the movie exists
    if (movieResult.rows.length === 0) {
      return res.status(404).json({ message: "Movie not found" });
    }

    const movie = movieResult.rows[0];
    const tmdbId = movie.tmdbid; // Extract TMDB ID
    res.json(tmdbId); // Return TMDB ID
  } catch (error) {
    console.error("Error in getMovieId:", error); // Log error for debugging
    res.status(500).json({ message: "Error fetching movie details." }); // Return error response
  }
};

// Function to save user ratings for movies
export const rateMovies = async (req, res) => {
  const userId = req.userId; // Extract user ID from the request
  const ratings = req.body.ratings; // Extract ratings from the request body

  try {
    await pool.query("BEGIN"); // Begin transaction

    const insertQuery = `
      INSERT INTO user_survey_ratings (userid, movieid, rating) 
      VALUES ($1, $2, $3)
      ON CONFLICT (userid, movieid) DO UPDATE SET rating = $3
    `;

    for (const [movieId, rating] of Object.entries(ratings)) {
      await pool.query(insertQuery, [userId, parseInt(movieId), rating]); // Insert or update ratings
    }

    await pool.query("COMMIT"); // Commit transaction
    res.status(200).json({ message: "Ratings successfully saved." }); // Return success response
  } catch (error) {
    await pool.query("ROLLBACK"); // Rollback transaction on error
    console.error("Error in rateMovies:", error); // Log error for debugging
    res.status(500).json({ message: "Error saving ratings." }); // Return error response
  }
};

// Function to fetch movies liked by the user
export const getLikedMovies = async (req, res) => {
  try {
    const userId = req.userId; // Extract user ID from the request

    const likedMovies = await pool.query(
      `SELECT m.movieid as "movieId", m.title, 
       EXTRACT(YEAR FROM TO_DATE(SUBSTRING(m.title FROM '\\(([0-9]{4})\\)'), 'YYYY')) as year
       FROM liked_movies lm
       JOIN movies m ON lm.movieid = m.movieid
       WHERE lm.userid = $1`,
      [userId]
    );

    res.json(likedMovies.rows); // Return liked movies
  } catch (error) {
    console.error("Error fetching liked movies:", error); // Log error for debugging
    res.status(500).json({
      success: false,
      message: "Failed to fetch liked movies",
      error: error.message,
    });
  }
};

// Function to like a movie
export const likeMovie = async (req, res) => {
  try {
    const userId = req.userId; // Extract user ID from the request
    const movieId = req.params.movieId; // Extract movie ID from the request parameters

    // Check if the movie exists
    const movieExists = await pool.query(
      "SELECT 1 FROM movies WHERE movieid = $1",
      [movieId]
    );

    if (movieExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Movie with ID ${movieId} not found`,
      });
    }

    // Check if the movie is already liked
    const alreadyLiked = await pool.query(
      "SELECT 1 FROM liked_movies WHERE userid = $1 AND movieid = $2",
      [userId, movieId]
    );

    if (alreadyLiked.rows.length > 0) {
      return res.json({
        success: true,
        message: "Movie already liked",
      });
    }

    // Insert the movie into liked_movies
    await pool.query(
      "INSERT INTO liked_movies (userid, movieid) VALUES ($1, $2)",
      [userId, movieId]
    );

    res.json({
      success: true,
      message: "Movie liked successfully",
    });
  } catch (error) {
    console.error("Error liking movie:", error); // Log error for debugging
    res.status(500).json({
      success: false,
      message: "Failed to like movie",
      error: error.message,
    });
  }
};

// Function to unlike a movie
export const unlikeMovie = async (req, res) => {
  try {
    const userId = req.userId; // Extract user ID from the request
    const movieId = req.params.movieId; // Extract movie ID from the request parameters

    await pool.query(
      "DELETE FROM liked_movies WHERE userid = $1 AND movieid = $2",
      [userId, movieId]
    );

    res.json({
      success: true,
      message: "Movie unliked successfully",
    });
  } catch (error) {
    console.error("Error unliking movie:", error); // Log error for debugging
    res.status(500).json({
      success: false,
      message: "Failed to unlike movie",
      error: error.message,
    });
  }
};

// Function to delete temporary movies for the user
export const deleteTemp = async (req, res) => {
  try {
    const userId = req.userId; // Extract user ID from the request

    await pool.query("DELETE FROM temp_preferred_movies WHERE userid = $1", [
      userId,
    ]);

    res.json({
      success: true,
      message: "Temporary movies deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting temporary movies:", error); // Log error for debugging
    res.status(500).json({
      success: false,
      message: "Failed to delete temporary movies",
      error: error.message,
    });
  }
};

// Function to search movies based on a query
export const searchMovies = async (req, res) => {
  try {
    const userId = req.userId; // Extract user ID from the request
    const { query } = req.query; // Extract search query from the request

    // Validate the query length
    if (!query || query.length < 2) {
      return res.json([]); // Return empty array if query is invalid
    }

    // Get user preferences first
    const { preferredGenres, preferredYears } = await getUserPreferences(userId);

    // Search by title or genre
    const searchQuery = `
      SELECT * FROM movies 
      WHERE 
        title ILIKE $1 OR
        genres ILIKE $1
      ORDER BY 
        CASE 
          WHEN title ILIKE $2 THEN 0  /* Exact start match */
          WHEN title ILIKE $1 THEN 1  /* Contains */
          ELSE 2                       /* Genre match */
        END,
        title
      LIMIT 10
    `;

    const result = await pool.query(searchQuery, [
      `%${query}%`, /* For contains match */
      `${query}%`, /* For starts with match */
    ]);

    // Add preference match information to each movie
    const moviesWithPreferenceInfo = result.rows.map((movie) => {
      // Check if movie genres match any preferred genres
      const movieGenres = movie.genres.split("|");
      const matchesGenres = preferredGenres.some((genre) =>
        movieGenres.includes(genre)
      );

      // Check if movie year matches preferred years
      const year = extractYear(movie.title);
      const matchesYear = year && preferredYears.includes(year);

      // Movie matches preferences if it matches both genre and year
      const matchesPreferences = matchesGenres && matchesYear;

      return {
        ...movie,
        source: matchesPreferences ? "preference" : "random",
      };
    });

    res.json(moviesWithPreferenceInfo); // Return the search results
  } catch (error) {
    console.error("Error searching movies:", error); // Log error for debugging
    res.status(500).json({
      success: false,
      message: "Failed to search movies",
      error: error.message,
    });
  }
};
