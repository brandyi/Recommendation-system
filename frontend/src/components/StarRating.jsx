import { useState } from "react";

// Component for star-based rating
const StarRating = ({ totalStars = 5, onRatingChange }) => {
  const [rating, setRating] = useState(0); // Current rating
  const [hover, setHover] = useState(0); // Hover state for visual feedback

  return (
    <div className="flex space-x-1">
      {/* Render stars dynamically based on totalStars */}
      {[...Array(totalStars)].map((_, index) => {
        const starValue = index + 1; // Star value starts from 1
        return (
          <button
            key={index}
            className={`text-2xl ${
              (hover || rating) >= starValue ? "text-yellow-400" : "text-gray-400"
            }`} // Change color based on hover or rating
            onClick={() => {setRating(starValue); onRatingChange(starValue);}} // Update rating and trigger callback
            onMouseEnter={() => setHover(starValue)} // Set hover state
            onMouseLeave={() => setHover(rating)} // Reset hover state
          >
            ★
          </button>
        );
      })}
    </div>
  );
};

export default StarRating;