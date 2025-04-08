import { useState, useEffect } from "react";
import { FaHeart, FaRegHeart } from "react-icons/fa";

const MovieCard = ({ movie, onLike}) => {
  const [liked, setLiked] = useState(movie.isLiked || false);

  useEffect(() => {
    setLiked(movie.isLiked || false);
  }, [movie.itemID, movie.isLiked]);

  const handleLike = () => {
    setLiked(!liked);
    onLike(movie.itemID);
  };


  const genres =
    typeof movie.genres === "string"
      ? movie.genres.split("|")
      : movie.genres || [];

  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-xl transition-transform duration-300">
      <div className="h-64 bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
        <span className="text-3xl font-bold text-white text-center px-4">
          {movie.title}
        </span>
      </div>

      <div className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-2xl font-semibold text-gray-800">
              {movie.title}
            </h3>
          </div>

          <button
            onClick={handleLike}
            className="text-red-500 hover:text-red-600 focus:outline-none"
          >
            {liked ? <FaHeart size={32} /> : <FaRegHeart size={32} />}
          </button>
        </div>

        <div className="mt-6">
          <p className="text-lg font-medium text-gray-700 mb-2">Genres:</p>
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

        {movie.score && (
          <div className="mt-4">
            <p className="text-lg text-gray-600">
              Match score: {(movie.score * 100).toFixed(1)}%
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MovieCard;
