import { useEffect, useState } from "react";
import useAxiosPrivate from "../hooks/useAxiosPrivate";
import { useNavigate, useLocation } from "react-router-dom";
import StarRating from "./StarRating";

const RateMovies = () => {
  const [movies, setMovies] = useState([]);
  const [ratedMovies, setRatedMovies] = useState({});
  const [ratingError, setRatingError] = useState(null);
  const axiosPrivate = useAxiosPrivate();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const controller = new AbortController();

    const fetchMovies = async () => {
      try {
        const response = await axiosPrivate.get("/movies", {
          signal: controller.signal,
        });
        const updatedMovies = response.data.map((movie) => ({
          ...movie,
          genres: movie.genres.replaceAll("|", ", "),
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
  }, []);

  const handleChange = async (movieId, source) => {
    try {
      const response = await axiosPrivate.get(
        `/movies/change?movieId=${movieId}&source=${source || "random"}`
      );

      const newMovieId = response.data.movieid;
      const isDuplicate = movies.some((movie) => movie.movieid === newMovieId);

      if (isDuplicate) {
        return handleChange(movieId, source);
      }

      const newMovie = {
        ...response.data,
        genres: response.data.genres.replaceAll("|", ", "),
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
    } catch (err) {
      console.error("Error changing movie:", err);
    }
  };

  const handleMovieRating = (movieId, rating) => {
    setRatedMovies((prev) => ({ ...prev, [movieId]: rating }));
  };

  const submitRating = async () => {
    // Clear previous errors
    setRatingError(null);

    // Check if all movies are rated
    const unratedMovies = movies.filter((movie) => !ratedMovies[movie.movieid]);

    if (unratedMovies.length > 0) {
      setRatingError(
        `Prosím, ohodnoť všetky filmy pred odoslaním (${unratedMovies.length} neohodnotených)`
      );

      // Scroll to the first unrated movie
      const firstUnratedId = unratedMovies[0].movieid;
      const element = document.getElementById(`movie-${firstUnratedId}`);
      if (element)
        element.scrollIntoView({ behavior: "smooth", block: "center" });

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
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex flex-col items-center py-10">
      <h1 className="text-3xl font-bold text-blue-600 mb-6">Ohodnoť filmy</h1>
      <div className="w-full max-w-4xl bg-white p-6 rounded-lg shadow-lg">
        <ul className="space-y-4">
          {movies.map((movie) => (
            <li
              id={`movie-${movie.movieid}`}
              key={movie.movieid}
              className={`flex flex-col md:flex-row md:justify-between gap-4 md:items-center p-4 rounded-lg shadow-sm 
                ${
                  !ratedMovies[movie.movieid] && ratingError
                    ? "bg-red-50 border border-red-200"
                    : "bg-gray-100 hover:bg-gray-200"
                }`}
            >
              <div>
                <h2 className="text-lg font-semibold text-gray-800">
                  {movie.title}
                </h2>
                <p className="text-sm text-gray-600">{movie.genres}</p>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
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

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:space-x-4 mt-3 md:mt-0">
                <StarRating
                  totalStars={5}
                  onRatingChange={(ratingValue) =>
                    handleMovieRating(movie.movieid, ratingValue)
                  }
                />
                <button
                  onClick={() => handleChange(movie.movieid, movie.source)}
                  className="text-white bg-green-600 hover:bg-green-700 font-medium rounded-lg text-sm px-4 py-2 w-full sm:w-auto"
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
              onClick={() => submitRating()}
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
