import { useState } from "react";

const StarRating = ({ totalStars = 5, onRatingChange }) => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);

  return (
    <div className="flex space-x-1">
      {[...Array(totalStars)].map((_, index) => {
        const starValue = index + 1;
        return (
          <button
            key={index}
            className={`text-2xl ${
              (hover || rating) >= starValue ? "text-yellow-400" : "text-gray-400"
            }`}
            onClick={() => {setRating(starValue); onRatingChange(starValue);}}
            onMouseEnter={() => setHover(starValue)}
            onMouseLeave={() => setHover(rating)}
          >
            ★
          </button>
        );
      })}
    </div>
  );
};

export default StarRating;