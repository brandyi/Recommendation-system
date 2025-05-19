import { useEffect, useState, useCallback, useMemo } from "react";
import useAxiosPrivate from "../hooks/useAxiosPrivate";
import { useNavigate, useLocation } from "react-router-dom";
import StarRating from "./StarRating";

// Helper function for consistent genre formatting
const formatGenres = (genreString) => {
  if (!genreString) return "";
  return typeof genreString === "string" ? genreString.replaceAll("|", ", ") : genreString;
};

const RateMovies = () => {
  // Add these constants at the top of your component
  const MAX_RATINGS = 20;
  const MAX_PREFERENCE_MOVIES = 15;
  const MAX_RANDOM_MOVIES = 5;

  const [movies, setMovies] = useState([]);
  const [ratedMovies, setRatedMovies] = useState({});
  const [ratingError, setRatingError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [ratingProgress, setRatingProgress] = useState(0);
  const [newlyAddedMovie, setNewlyAddedMovie] = useState(null);
  const axiosPrivate = useAxiosPrivate();
  const navigate = useNavigate();
  const location = useLocation();

  // Rating progress tracking
  useEffect(() => {
    setRatingProgress(Object.keys(ratedMovies).length);
  }, [ratedMovies]);

  // Initial movie loading
  useEffect(() => {
    const controller = new AbortController();

    const fetchMovies = async () => {
      try {
        const response = await axiosPrivate.get("/movies", {
          signal: controller.signal,
        });
        const updatedMovies = response.data.map((movie) => ({
          ...movie,
          genres: formatGenres(movie.genres),
        }));
        setMovies(updatedMovies);
      } catch (err) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          navigate("/login", { state: { from: location }, replace: true });
        }
      }
    };
    fetchMovies();

    return () => {
      controller.abort();
    };
  }, [axiosPrivate, navigate, location]);

  // Movie search effect
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      const performSearch = async () => {
        setIsSearching(true);
        try {
          const response = await axiosPrivate.get(
            `/movies/search?query=${encodeURIComponent(searchQuery)}`
          );
          
          const formattedResults = response.data.map((movie) => ({
            ...movie,
            genres: formatGenres(movie.genres),
            isAlreadyAdded: movies.some((m) => m.movieid === movie.movieid)
          }));
          
          setSearchResults(formattedResults);
        } catch (err) {
          console.error("Error searching movies:", err);
        } finally {
          setIsSearching(false);
        }
      };

      performSearch();
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery, axiosPrivate, movies]);

  // Add CSS animation for highlighting
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes highlightMovie {
        0% { background-color: #dbeafe; } 
        50% { background-color: #93c5fd; }
        100% { background-color: #dbeafe; }
      }
      .movie-highlight {
        animation: highlightMovie 2s ease;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Scroll to and highlight newly added movie
  useEffect(() => {
    if (newlyAddedMovie) {
      setTimeout(() => {
        const element = document.getElementById(`movie-${newlyAddedMovie}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          element.classList.add("movie-highlight");
          setTimeout(() => {
            element.classList.remove("movie-highlight");
            setNewlyAddedMovie(null);
          }, 2000);
        }
      }, 100);
    }
  }, [newlyAddedMovie]);

  // Optimize finding unrated movies
  const unratedMovies = useMemo(() => {
    return movies.filter(movie => !ratedMovies[movie.movieid]);
  }, [movies, ratedMovies]);

  // Helper function to count movies by source type
  const movieCountBySource = useMemo(() => {
    const counts = {
      preference: 0,
      random: 0,
      preferenceRated: 0,
      randomRated: 0
    };
    
    movies.forEach(movie => {
      if (movie.source === "preference") {
        counts.preference++;
        if (ratedMovies[movie.movieid]) counts.preferenceRated++;
      } else {
        counts.random++;
        if (ratedMovies[movie.movieid]) counts.randomRated++;
      }
    });
    
    return counts;
  }, [movies, ratedMovies]);

  // Add movie from search results
  const addMovieToRate = useCallback((movie) => {
    // Check if we already have this movie
    if (movies.some((m) => m.movieid === movie.movieid)) {
      return;
    }
    
    // Check if we've reached the limit for this movie's source type
    if (movie.source === "preference" && movieCountBySource.preference >= MAX_PREFERENCE_MOVIES) {
      // Find an unrated preference movie to replace
      const unratedPreferenceIndex = movies.findIndex(
        m => m.source === "preference" && !ratedMovies[m.movieid]
      );
      
      if (unratedPreferenceIndex !== -1) {
        // Replace an unrated preference movie
        const updatedMovies = [...movies];
        updatedMovies[unratedPreferenceIndex] = {
          ...movie,
          genres: formatGenres(movie.genres)
        };
        setMovies(updatedMovies);
        setNewlyAddedMovie(movie.movieid);
      } else {
        // Show error - all preference movies are rated
        setRatingError("Nemôžeš pridať viac filmov podľa preferencií. Prosím ohodnoť existujúce alebo pridaj náhodný film.");
        setTimeout(() => setRatingError(null), 3000);
        return;
      }
    } 
    else if (movie.source === "random" && movieCountBySource.random >= MAX_RANDOM_MOVIES) {
      // Find an unrated random movie to replace
      const unratedRandomIndex = movies.findIndex(
        m => m.source === "random" && !ratedMovies[m.movieid]
      );
      
      if (unratedRandomIndex !== -1) {
        // Replace an unrated random movie
        const updatedMovies = [...movies];
        updatedMovies[unratedRandomIndex] = {
          ...movie,
          genres: formatGenres(movie.genres)
        };
        setMovies(updatedMovies);
        setNewlyAddedMovie(movie.movieid);
      } else {
        // Show error - all random movies are rated
        setRatingError("Nemôžeš pridať viac náhodných filmov. Prosím ohodnoť existujúce alebo pridaj film podľa preferencií.");
        setTimeout(() => setRatingError(null), 3000);
        return;
      }
    }
    else {
      // We haven't reached the limit, so replace an unrated movie of the same type
      const unratedSameSourceIndex = movies.findIndex(
        m => m.source === movie.source && !ratedMovies[m.movieid]
      );
      
      if (unratedSameSourceIndex !== -1) {
        // Replace unrated movie of same source
        const updatedMovies = [...movies];
        updatedMovies[unratedSameSourceIndex] = {
          ...movie,
          genres: formatGenres(movie.genres)
        };
        setMovies(updatedMovies);
      } 
      else if (unratedMovies.length > 0) {
        // Replace any unrated movie as fallback
        const firstUnratedIndex = movies.findIndex(m => !ratedMovies[m.movieid]);
        const updatedMovies = [...movies];
        updatedMovies[firstUnratedIndex] = {
          ...movie,
          genres: formatGenres(movie.genres)
        };
        setMovies(updatedMovies);
      }
      else if (movies.length < MAX_RATINGS) {
        // Add a new movie if under total limit
        setMovies(prev => [
          ...prev, 
          {...movie, genres: formatGenres(movie.genres)}
        ]);
      }
    }
    
    // Clear search and highlight new movie
    setNewlyAddedMovie(movie.movieid);
    setSearchResults([]);
    setSearchQuery("");
  }, [movies, ratedMovies, unratedMovies, movieCountBySource]);

  // Handle replacing a movie
  const handleChange = useCallback(async (movieId, source) => {
    try {
      // Get all current movie IDs to avoid duplicates
      const currentMovieIds = movies.map(movie => movie.movieid);
      
      const response = await axiosPrivate.get(
        `/movies/change?movieId=${movieId}&source=${source || "random"}`
      );


      const newMovie = {
        ...response.data,
        genres: formatGenres(response.data.genres),
      };

      const updatedMovies = movies.map((movie) =>
        movie.movieid === movieId ? newMovie : movie
      );

      setRatedMovies((prevRated) => {
        const updatedRated = { ...prevRated };
        delete updatedRated[movieId];
        return updatedRated;
      });

      setMovies(updatedMovies);
      setNewlyAddedMovie(newMovie.movieid);
    } catch (err) {
      console.error("Error changing movie:", err);
    }
  }, [axiosPrivate, movies]);

  // Handle rating a movie
  const handleMovieRating = useCallback((movieId, rating) => {
    setRatedMovies((prev) => ({ ...prev, [movieId]: rating }));
  }, []);

  // Submit all ratings
  const submitRating = useCallback(async () => {
    setRatingError(null);

    // Calculate unrated count properly
    const unratedCount = Math.min(movies.length, MAX_RATINGS) - ratingProgress;
    
    if (unratedCount > 0) {
      setRatingError(
        `Prosím, ohodnoť všetky filmy pred odoslaním (${unratedCount} neohodnotených)`
      );

      // Find first unrated and scroll to it
      if (unratedMovies.length > 0) {
        const element = document.getElementById(`movie-${unratedMovies[0].movieid}`);
        if (element)
          element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    try {
      await axiosPrivate.post("/movies/rate", {
        ratings: ratedMovies,
      });
      await axiosPrivate.delete("/movies/delete-temp");
      navigate("/generate", { replace: true });
    } catch (err) {
      console.error("Error submitting ratings:", err);
      setRatingError("Nastala chyba pri odosielaní hodnotení");
    }
  }, [axiosPrivate, movies.length, ratingProgress, unratedMovies, ratedMovies, navigate]);

  return (
    // Main container - add px-4 for padding on smaller screens
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex flex-col items-center py-10 px-4">
      <h1 className="text-3xl font-bold text-blue-600 mb-6">Ohodnoť filmy</h1>

      {/* Progress Bar */}
      {/* Reduce max-width on very small screens */}
      <div className="w-full max-w-[95%] sm:max-w-4xl mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            Hodnotenie: {ratingProgress}/{MAX_RATINGS} filmov
          </span>
          <span className="text-sm font-medium text-gray-700">
            {Math.round((ratingProgress / MAX_RATINGS) * 100)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full"
            style={{ width: `${(ratingProgress / MAX_RATINGS) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Movie counts by type - optional */}
      <div className="w-full max-w-[95%] sm:max-w-4xl mb-4">
        <div className="flex justify-between items-center">
          <div className="text-sm">
            <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded mr-2">
              Podľa preferencií: {movieCountBySource.preferenceRated}/{movieCountBySource.preference}
            </span>
            <span className="inline-block px-2 py-1 bg-gray-200 text-gray-800 rounded">
              Náhodné: {movieCountBySource.randomRated}/{movieCountBySource.random}
            </span>
          </div>
        </div>
      </div>

      {/* Search Box */}
      {/* Search container - add more padding on small screens */}
      <div className="w-full max-w-[95%] sm:max-w-4xl bg-white p-4 sm:p-6 rounded-lg shadow-lg mb-6">
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Hľadaj filmy na hodnotenie..."
            className="flex-grow p-2 border border-gray-300 rounded-lg"
          />
          {isSearching && (
            <div className="text-sm text-blue-600">Vyhľadávam...</div>
          )}
        </div>

        {searchQuery && !isSearching && (
          <div className="mt-4 border-t pt-4">
            <h3 className="font-medium text-gray-800 mb-2">Výsledky vyhľadávania</h3>

            {searchResults.length > 0 ? (
              <ul className="max-h-60 overflow-y-auto">
                {searchResults.map((movie) => {
                  // Check if we've reached the limit for this movie's source type
                  const isPreferenceFull = movie.source === "preference" && 
                    movieCountBySource.preference >= MAX_PREFERENCE_MOVIES && 
                    !movies.some(m => m.source === "preference" && !ratedMovies[m.movieid]);
                    
                  const isRandomFull = movie.source === "random" && 
                    movieCountBySource.random >= MAX_RANDOM_MOVIES && 
                    !movies.some(m => m.source === "random" && !ratedMovies[m.movieid]);
                    
                  const isCategoryFull = isPreferenceFull || isRandomFull;
                  
                  return (
                    <li
                      key={movie.movieid}
                      className={`p-2 rounded flex justify-between items-center ${
                        movie.isAlreadyAdded || isCategoryFull ? 'bg-gray-50' : 'hover:bg-gray-100 cursor-pointer'
                      }`}
                      onClick={() => !movie.isAlreadyAdded && !isCategoryFull && addMovieToRate(movie)}
                    >
                      <div>
                        <p className={`font-medium ${movie.isAlreadyAdded || isCategoryFull ? 'text-gray-500' : 'text-gray-800'}`}>
                          {movie.title}
                        </p>
                        <p className="text-sm text-gray-600">{movie.genres}</p>
                        
                        {/* Display appropriate badge based on source */}
                        <span
                          className={`text-xs px-2 py-1 rounded-full inline-block mt-1 ${
                            movie.source === "preference"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-300 text-gray-800"
                          }`}
                        >
                          {movie.source === "preference"
                            ? "Založené na tvojich preferenciách"
                            : "Náhodný výber"}
                        </span>
                      </div>
                      
                      {movie.isAlreadyAdded ? (
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                          Film už pridaný
                        </span>
                      ) : isCategoryFull ? (
                        <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">
                          {movie.source === "preference" 
                            ? "Limit preferencií dosiahnutý" 
                            : "Limit náhodných filmov dosiahnutý"}
                        </span>
                      ) : (
                        <button className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          Pridať
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="text-center py-6 text-gray-600">
                <p>Film nenájdený</p>
                <p className="text-sm mt-2">Skúste zmeniť vyhľadávací výraz</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Movie List */}
      {/* Movies list container */}
      <div className="w-full max-w-[95%] sm:max-w-4xl bg-white p-4 sm:p-6 rounded-lg shadow-lg">
        {/* Movie list with better spacing */}
        <ul className="space-y-4">
          {movies.map((movie) => (
            <li
              id={`movie-${movie.movieid}`}
              key={movie.movieid}
              className={`flex flex-col md:flex-row md:justify-between gap-3 md:items-center p-3 sm:p-4 rounded-lg shadow-sm 
                ${
                  !ratedMovies[movie.movieid] && ratingError
                    ? "bg-red-50 border border-red-200"
                    : "bg-gray-100 hover:bg-gray-200"
                } ${newlyAddedMovie === movie.movieid ? "movie-highlight" : ""}`}
            >
              {/* Movie details with better text wrapping */}
              <div className="break-words">
                <h2 className="text-base sm:text-lg font-semibold text-gray-800">
                  {movie.title}
                </h2>
                <p className="text-xs sm:text-sm text-gray-600">{movie.genres}</p>
                {/* Make badges fit better on small screens */}
                <span
                  className={`text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full ${
                    movie.source === "preference"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-gray-300 text-gray-800"
                  }`}
                >
                  {movie.source === "preference"
                    ? "Založené na preferenciách" // Shorter on mobile
                    : "Náhodný výber"}
                </span>
              </div>

              {/* Rating and button with better spacing */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 mt-2 md:mt-0">
                <StarRating
                  totalStars={5}
                  onRatingChange={(ratingValue) =>
                    handleMovieRating(movie.movieid, ratingValue)
                  }
                />
                <button
                  onClick={() => handleChange(movie.movieid, movie.source)}
                  className="text-white bg-green-600 hover:bg-green-700 font-medium rounded-lg text-xs sm:text-sm px-3 py-1.5 sm:px-4 sm:py-2 w-full sm:w-auto"
                >
                  Zmeň film
                </button>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-6">
          {ratingError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {ratingError}
            </div>
          )}

          <div className="flex justify-center">
            <button
              className="text-white bg-blue-600 hover:bg-blue-700 font-medium rounded-lg text-sm px-6 py-3"
              onClick={submitRating}
            >
              Pošli všetky ohodnotenia
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RateMovies;
