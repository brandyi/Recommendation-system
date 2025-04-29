import { useState, useEffect } from "react";
import { FaHeart, FaRegHeart } from "react-icons/fa";

const MovieCard = ({ movie, onLike }) => {
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
    <div className="bg-white rounded-lg overflow-hidden shadow-xl w-5/6 mx-auto h-4/5">
      <div className="h-64 bg-gray-200 flex flex-col items-center justify-center text-gray-500">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-16 w-16 mb-2"
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
        <p className="text-sm font-medium">Obrázok nedostupný</p>
        <p className="text-base font-semibold mt-1">{movie.title}</p>
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
      </div>
    </div>
  );
};

export default MovieCard;
