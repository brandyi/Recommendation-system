import pool from "../config/dbConn.js"; // Import the database connection pool
import recommendationService from "../services/recommendationService.js"; // Import the recommendation service

// Function to fetch movie recommendations for the user
export const getRecommendations = async (req, res) => {
  try {
    const userId = req.userId; // Extract user ID from the request

    // Validate that the user is authenticated
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    // Fetch recommendations from the recommendation service
    const recommendations = await recommendationService.getRecommendations(userId);

    // Validate that recommendations exist
    if (
      !recommendations ||
      (!recommendations.ncf_recommendations?.length &&
        !recommendations.cf_recommendations?.length)
    ) {
      return res.status(404).json({ success: false, message: "No recommendations available" });
    }

    // Extract movie IDs from both recommendation sets
    const ncfMovieIds = recommendations.ncf_recommendations?.map((rec) => rec.itemID) || [];
    const cfMovieIds = recommendations.cf_recommendations?.map((rec) => rec.itemID) || [];
    const allMovieIds = [...new Set([...ncfMovieIds, ...cfMovieIds])]; // Combine and deduplicate movie IDs

    if (allMovieIds.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No movie IDs found in recommendations",
      });
    }

    const movieDetailsQuery = `
      SELECT movieid, title, genres
      FROM movies
      WHERE movieid = ANY($1)
    `;

    const movieDetailsResult = await pool.query(movieDetailsQuery, [
      allMovieIds,
    ]);
    const movieDetails = {};

    movieDetailsResult.rows.forEach((movie) => {
      movieDetails[movie.movieid] = {
        title: movie.title,
        genres: movie.genres,
      };
    });

    // Check which movies are already liked by the user
    const likedMoviesQuery = `
        SELECT movieid
        FROM liked_movies
        WHERE userid = $1 AND movieid = ANY($2)
      `;

    const likedMoviesResult = await pool.query(likedMoviesQuery, [
      userId,
      allMovieIds,
    ]);
    const likedMovieIds = new Set(
      likedMoviesResult.rows.map((row) => row.movieid)
    );

    // Enrich recommendations with movie details and liked status
    const enrichedNcfRecommendations =
      recommendations.ncf_recommendations?.map((rec) => ({
        itemID: rec.itemID,
        prediction: rec.prediction,
        title: movieDetails[rec.itemID]?.title || "Unknown Movie",
        genres: movieDetails[rec.itemID]?.genres || "",
        isLiked: likedMovieIds.has(rec.itemID), // Check if the movie is liked
        source: "neural_cf", // Source of recommendation
      })) || [];

    const enrichedCfRecommendations =
      recommendations.cf_recommendations?.map((rec) => ({
        itemID: rec.itemID,
        prediction: rec.prediction,
        title: movieDetails[rec.itemID]?.title || "Unknown Movie",
        genres: movieDetails[rec.itemID]?.genres || "",
        isLiked: likedMovieIds.has(rec.itemID), // Check if the movie is liked
        source: "user_cf", // Source of recommendation
      })) || [];

    // Return the enriched recommendations
    res.json({
      ncf_recommendations: enrichedNcfRecommendations,
      cf_recommendations: enrichedCfRecommendations,
    });
  } catch (error) {
    console.error("Error getting recommendations:", error); // Log error for debugging
    res.status(500).json({
      success: false,
      message: "Failed to get recommendations",
      error: error.message,
    });
  }
};

export default { getRecommendations }; // Export the recommendations controller
