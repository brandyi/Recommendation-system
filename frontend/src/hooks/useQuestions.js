import { useState, useEffect } from "react";

// Custom hook to manage questions for the questionnaire
const useQuestions = () => {
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    // Predefined questions for the survey
    const Questions = [
      {
        id: 1,
        text: "Aké sú tvoje obľúbené filmové žánre ?",
        options: ["Action", "Adventure", "Animation", "Children's", "Comedy", "Crime", "Documentary", "Drama", "Fantasy", "Film-Noir", "Horror", "Musical", "Mystery", "Romance", "Sci-Fi", "Thriller", "War", "Western"],
        multiple: true, // Allows multiple selections
      },
      {
        id: 2,
        text: "Ktorú dekádu filmov najviac obľubuješ?",
        options: ["pred 1990s", "1990s", "2000s", "2010s a novšie"],
        multiple: false, // Single selection only
      },
    ];

    // Set the questions state
    setQuestions(Questions);
  }, []);

  // Return the questions state
  return { questions };
};

export default useQuestions;
