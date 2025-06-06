import { useState, useEffect } from "react";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import useAxiosPrivate from "../hooks/useAxiosPrivate";
import axios from "axios";

const API_TOKEN = import.meta.env.VITE_TMDB_API_TOKEN;

// Component for rating the likelihood of watching a movie
const WatchLikelihoodRating = ({ rating, onRatingChange }) => {
  return (
    <div className="mt-4">
      <p className="text-lg font-medium text-gray-700 mb-2">
        Na koľko by si si tento film reálne pozrel?
      </p>
      <div className="flex flex-wrap items-center gap-1">
        {/* Render buttons for 1-10 rating */}
        {[...Array(10)].map((_, i) => (
          <button
            key={i}
            className={`w-8 h-8 rounded-full flex items-center justify-center focus:outline-none transition-colors 
              ${rating >= i + 1 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
            onClick={() => onRatingChange(i + 1)} // Update rating on click
          >
            {i + 1}
          </button>
        ))}
      </div>
      {/* Display rating description */}
      <p className="text-sm text-gray-500 mt-1">
        {rating === 0 ? 'Neohodnotené' : 
         rating <= 3 ? 'Nepravdepodobné' : 
         rating <= 6 ? 'Možno' : 
         rating <= 8 ? 'Pravdepodobné' : 
         'Určite'}
      </p>
    </div>
  );
};

// Component for displaying movie details and interactions
const MovieCard = ({ movie, onLike, onRateWatchLikelihood }) => {
  const [liked, setLiked] = useState(movie.isLiked || false); // State for like status
  const [imgSrc, setImgSrc] = useState(null); // State for movie image
  const [watchRating, setWatchRating] = useState(movie.watchLikelihood || 0); // State for watch likelihood rating

  const axiosPrivate = useAxiosPrivate(); // Axios instance for private requests

  useEffect(() => {
    // Fetch movie image from TMDB API
    setImgSrc(null);
    const fetchMovieImage = async () => {
      try {
        const responseBackend = await axiosPrivate.get(
          `/movies/${movie.itemID}` // Get TMDB ID from backend
        );
        const tmdbID = responseBackend.data;

        const responseAPI = await axios.get(
          `https://api.themoviedb.org/3/movie/${tmdbID}?language=en-US`,
          {
            headers: {
              accept: "application/json",
              Authorization: "Bearer " + API_TOKEN, // Use TMDB API token
            },
          }
        );

        const imagePath = responseAPI.data.poster_path;

        if (imagePath) {
          setImgSrc(`https://image.tmdb.org/t/p/original${imagePath}`); // Set image source
        } else {
          setImgSrc(null); // Handle missing image
        }
      } catch (error) {
        console.error("Error fetching movie image:", error); // Log errors
      }
    };
    fetchMovieImage();
  }, [movie.itemID]);

  useEffect(() => {
    // Update like and rating states when movie changes
    setLiked(movie.isLiked || false);
    setWatchRating(movie.watchLikelihood || 0);
  }, [movie.itemID, movie.isLiked, movie.watchLikelihood]);

  const handleLike = () => {
    setLiked(!liked); // Toggle like status
    onLike(movie.itemID); // Trigger like callback
  };

  const handleRatingChange = (rating) => {
    setWatchRating(rating); // Update rating state
    if (onRateWatchLikelihood) {
      onRateWatchLikelihood(movie.itemID, rating); // Trigger rating callback
    }
  };

  const genres =
    typeof movie.genres === "string"
      ? movie.genres.split("|") // Split genres string into array
      : movie.genres || []; // Handle missing genres

  return (
    <div
      className="bg-white rounded-lg overflow-hidden shadow-xl mx-auto 
    h-auto sm:h-4/5 md:h-3/4 lg:h-3/5 xl:h-2/3 flex flex-col"
    >
      {/* Movie image */}
      <div className="aspect-[2/3] bg-gray-200 text-center text-gray-500 max-h-[60vh] flex items-center justify-center">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={movie.title}
            className="w-full h-full object-contain"
          />
        ) : (
          <>
            {/* Placeholder for missing image */}
            <div className="flex flex-col items-center justify-center p-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-16 w-16 mb-2 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="text-sm font-medium text-gray-500">
                Obrázok nedostupný
              </p>
              <p className="text-base font-semibold mt-1 text-gray-600">
                {movie.title}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Movie details */}
      <div className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-2xl font-semibold text-gray-800">
              {movie.title} {/* Movie title */}
            </h3>
          </div>

          {/* Like button */}
          <button
            onClick={handleLike}
            className="text-red-500 hover:text-red-600 focus:outline-none"
          >
            {liked ? <FaHeart size={32} /> : <FaRegHeart size={32} />}
          </button>
        </div>

        {/* Movie genres */}
        <div className="mt-6">
          <p className="text-lg font-medium text-gray-700 mb-2">Žánre:</p>
          <div className="flex flex-wrap gap-2">
            {genres.map((genre, index) => (
              <span
                key={index}
                className="inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700"
              >
                {genre}
              </span>
            ))}
          </div>
        </div>
        
        {/* Watch likelihood rating */}
        <WatchLikelihoodRating 
          rating={watchRating} 
          onRatingChange={handleRatingChange} 
        />
      </div>
    </div>
  );
};

export default MovieCard;
