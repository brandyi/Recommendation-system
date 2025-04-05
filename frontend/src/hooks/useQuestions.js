import { useState, useEffect } from "react";

const useQuestions = () => {
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    const Questions = [
      {
        id: 1,
        text: "What are your favorite movie genres?",
        options: ["Action", "Adventure", "Animation", "Children's", "Comedy", "Crime", "Documentary", "Drama", "Fantasy", "Film-Noir", "Horror", "Musical", "Mystery", "Romance", "Sci-Fi", "Thriller", "War", "Western"],
        multiple: true,
      },
      {
        id: 2,
        text: "Which decades of movies do you enjoy the most?",
        options: ["before 1990s", "1990s", "2000s", "2010s"],
        multiple: false,
      },
    ];

    setQuestions(Questions);
  }, []);

  return { questions};
};

export default useQuestions;
