import { useState, useEffect } from "react";

const useQuestions = () => {
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    const Questions = [
      {
        id: 1,
        text: "Aké sú tvoje obľúbené filmové žánre ?",
        options: ["Action", "Adventure", "Animation", "Children's", "Comedy", "Crime", "Documentary", "Drama", "Fantasy", "Film-Noir", "Horror", "Musical", "Mystery", "Romance", "Sci-Fi", "Thriller", "War", "Western"],
        multiple: true,
      },
      {
        id: 2,
        text: "Ktorú dekádu filmov najviac obľubuješ?",
        options: ["pred 1990s", "1990s", "2000s", "2010s a novšie"],
        multiple: false,
      },
    ];

    setQuestions(Questions);
  }, []);

  return { questions};
};

export default useQuestions;
