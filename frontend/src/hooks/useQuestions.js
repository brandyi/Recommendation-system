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
        text: "What is your preferred movie length?",
        options: ["Less than 90 minutes", "90-120 minutes", "Over 120 minutes"],
        multiple: false,
      },
      {
        id: 3,
        text: "Which decades of movies do you enjoy the most?",
        options: ["before 1990s", "1990s", "2000s", "2010s", "2020s"],
        multiple: false,
      },
    ];

    setQuestions(Questions);
  }, []);

  return { questions};
};

export default useQuestions;
