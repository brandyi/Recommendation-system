import pool from "../config/dbConn.js";
import recommendationService from "../services/recommendationService.js";

export const getRecommendations = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const recommendations = await recommendationService.getRecommendations(
      userId
    );

    if (
      !recommendations ||
      (!recommendations.ncf_recommendations?.length &&
        !recommendations.cf_recommendations?.length)
    ) {
      return res
        .status(404)
        .json({ success: false, message: "No recommendations available" });
    }

    const ncfMovieIds =
      recommendations.ncf_recommendations?.map((rec) => rec.itemID) || [];
    const cfMovieIds =
      recommendations.cf_recommendations?.map((rec) => rec.itemID) || [];
    const allMovieIds = [...new Set([...ncfMovieIds, ...cfMovieIds])];

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

    // Enrich both recommendation sets
    const enrichedNcfRecommendations =
      recommendations.ncf_recommendations?.map((rec) => ({
        itemID: rec.itemID,
        prediction: rec.prediction,
        title: movieDetails[rec.itemID]?.title || "Unknown Movie",
        genres: movieDetails[rec.itemID]?.genres || "",
        isLiked: likedMovieIds.has(rec.itemID),
        source: "neural_cf",
      })) || [];

    const enrichedCfRecommendations =
      recommendations.cf_recommendations?.map((rec) => ({
        itemID: rec.itemID,
        prediction: rec.prediction,
        title: movieDetails[rec.itemID]?.title || "Unknown Movie",
        genres: movieDetails[rec.itemID]?.genres || "",
        isLiked: likedMovieIds.has(rec.itemID),
        source: "user_cf",
      })) || [];

    res.json({
      ncf_recommendations: enrichedNcfRecommendations,
      cf_recommendations: enrichedCfRecommendations,
    });
  } catch (error) {
    console.error("Error getting recommendations:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get recommendations",
      error: error.message,
    });
  }
};

export default { getRecommendations };
