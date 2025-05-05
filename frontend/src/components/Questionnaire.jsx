import { useEffect, useState } from "react";
import useQuestions from "../hooks/useQuestions";
import useAxiosPrivate from "../hooks/useAxiosPrivate";
import { useNavigate, useLocation } from "react-router-dom";

const Questionnaire = () => {
  const [answers, setAnswers] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [error, setError] = useState(null);
  const { questions } = useQuestions();
  const axiosPrivate = useAxiosPrivate();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const controller = new AbortController();
    const getAnswers = async () => {
      try {
        const response = await axiosPrivate.get("/answers", {
          signal: controller.signal,
        });
        const { filledSurvey: survey, filledRatings: ratings } = response.data;
        if (survey && !ratings) {
          navigate("/survey/film-rating", { replace: true });
        } else if (survey && ratings) {
          navigate("/generate", { replace: true });
        }
      } catch (err) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          navigate("/login", { state: { from: location }, replace: true });
        }
      }
    };
    getAnswers();

    return () => {
      controller.abort();
    };
  }, []);

  // Add these two validation functions
  const isCurrentQuestionAnswered = () => {
    const questionId = currentQuestion.id;
    if (!answers[questionId]) return false;
    
    // For multiple-choice questions, ensure at least one option is selected
    if (currentQuestion.multiple) {
      return Array.isArray(answers[questionId]) && answers[questionId].length > 0;
    }
    
    // For single-choice questions
    return answers[questionId] !== undefined;
  };

  const areAllQuestionsAnswered = () => {
    return questions.every(question => {
      if (!answers[question.id]) return false;
      
      if (question.multiple) {
        return Array.isArray(answers[question.id]) && answers[question.id].length > 0;
      }
      
      return answers[question.id] !== undefined;
    });
  };

  const handleSubmit = async () => {
    if (!isCurrentQuestionAnswered()) {
      setError("Prosím, odpovedzte na aktuálnu otázku.");
      return;
    }
    
    if (!areAllQuestionsAnswered()) {
      setError("Niektoré otázky neboli zodpovedané. Skontrolujte svoje odpovede.");
      return;
    }

    const controller = new AbortController();

    try {
      const response = await axiosPrivate.post(
        "/answers",
        { answers: answers },
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: true,
          signal: controller.signal,
        }
      );
      setError(null);
      navigate("/survey/film-rating", { replace: true });
    } catch (err) {
      console.log(err.status);
      if (err.response?.status === 401 || err.response?.status === 403) {
        navigate("/login", { state: { from: location }, replace: true });
      } else {
        setError("Failed to submit answers. Please try again.");
      }
    }

    return () => {
      controller.abort();
    };
  };

  const handleCheckboxChange = (questionId, option, isMultiple) => {
    setAnswers((prevAnswers) => {
      if (isMultiple) {
        const selectedOptions = prevAnswers[questionId] || [];
        if (selectedOptions.includes(option)) {
          return {
            ...prevAnswers,
            [questionId]: selectedOptions.filter((item) => item !== option),
          };
        } else {
          return {
            ...prevAnswers,
            [questionId]: [...selectedOptions, option],
          };
        }
      } else {
        return {
          ...prevAnswers,
          [questionId]: option,
        };
      }
    });
  };

  const handleNext = () => {
    if (!isCurrentQuestionAnswered()) {
      setError("Prosím, odpovedzte na otázku pred pokračovaním.");
      return;
    }
    
    setError(null);
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prevIndex) => prevIndex + 1);
    }
  };

  if (questions.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Načitávam otázky...</p>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <section className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        <h1 className="text-3xl font-bold text-blue-600 mb-6">Dotazník</h1>
        {error && (
          <div className="mb-4 p-3 text-red-700 bg-red-100 border border-red-400 rounded">
            {error}
          </div>
        )}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            {currentQuestion.text}
          </h3>
          {currentQuestion.options.map((option) => (
            <label key={option} className="block text-gray-600">
              <input
                type={currentQuestion.multiple ? "checkbox" : "radio"}
                checked={
                  currentQuestion.multiple
                    ? answers[currentQuestion.id]?.includes(option) || false
                    : answers[currentQuestion.id] === option
                }
                onChange={() =>
                  handleCheckboxChange(
                    currentQuestion.id,
                    option,
                    currentQuestion.multiple
                  )
                }
                className="mr-2"
              />
              {option}
            </label>
          ))}
        </div>
        <div className="flex justify-start mt-4">
          {currentQuestionIndex < questions.length - 1 ? (
            <button
              onClick={handleNext}
              disabled={!isCurrentQuestionAnswered()}
              className={`text-white font-medium rounded-lg text-sm px-5 py-2.5 ${
                isCurrentQuestionAnswered() 
                  ? "bg-blue-600 hover:bg-blue-700" 
                  : "bg-blue-400 cursor-not-allowed"
              }`}
            >
              Ďalšia otázka
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="text-white font-medium rounded-lg text-sm px-5 py-2.5 bg-blue-600 hover:bg-blue-700"
            >
              Odoslať odpoveď
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

export default Questionnaire;
