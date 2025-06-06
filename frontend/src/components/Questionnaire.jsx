import { useEffect, useState } from "react";
import useQuestions from "../hooks/useQuestions";
import useAxiosPrivate from "../hooks/useAxiosPrivate";
import { useNavigate, useLocation } from "react-router-dom";

// Component for displaying and submitting a questionnaire
const Questionnaire = () => {
  const [answers, setAnswers] = useState({}); // State to store user answers
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0); // Index of the current question
  const [error, setError] = useState(null); // Error message state
  const { questions } = useQuestions(); // Fetch predefined questions using custom hook
  const axiosPrivate = useAxiosPrivate(); // Axios instance for private requests
  const navigate = useNavigate(); // Navigation hook
  const location = useLocation(); // Location hook

  useEffect(() => {
    const controller = new AbortController();

    // Check if the user has already completed the questionnaire
    const getAnswers = async () => {
      try {
        const response = await axiosPrivate.get("/answers", {
          signal: controller.signal, // Abort signal for cleanup
        });
        const { filledSurvey: survey, filledRatings: ratings } = response.data;

        // Redirect based on survey and ratings completion status
        if (survey && !ratings) {
          navigate("/survey/film-rating", { replace: true });
        } else if (survey && ratings) {
          navigate("/generate", { replace: true });
        }
      } catch (err) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          navigate("/login", { state: { from: location }, replace: true }); // Redirect to login on unauthorized access
        }
      }
    };
    getAnswers();

    return () => {
      controller.abort(); // Cleanup abort controller
    };
  }, []);

  // Validate if the current question is answered
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

  // Validate if all questions are answered
  const areAllQuestionsAnswered = () => {
    return questions.every(question => {
      if (!answers[question.id]) return false;

      if (question.multiple) {
        return Array.isArray(answers[question.id]) && answers[question.id].length > 0;
      }

      return answers[question.id] !== undefined;
    });
  };

  // Submit the questionnaire answers
  const handleSubmit = async () => {
    if (!isCurrentQuestionAnswered()) {
      setError("Prosím, odpovedz na aktuálnu otázku."); // Show error for unanswered question
      return;
    }

    if (!areAllQuestionsAnswered()) {
      setError("Niektoré otázky neboli zodpovedané. Skontroluj svoje odpovede."); // Show error for incomplete answers
      return;
    }

    const controller = new AbortController();

    try {
      const response = await axiosPrivate.post(
        "/answers",
        { answers: answers }, // Submit answers to the server
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: true,
          signal: controller.signal,
        }
      );
      setError(null); // Clear error state
      navigate("/survey/film-rating", { replace: true }); // Redirect to the next step
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        navigate("/login", { state: { from: location }, replace: true }); // Redirect to login on unauthorized access
      } else {
        setError("Failed to submit answers. Please try again."); // Show error for submission failure
      }
    }

    return () => {
      controller.abort(); // Cleanup abort controller
    };
  };

  // Handle changes to checkbox or radio inputs
  const handleCheckboxChange = (questionId, option, isMultiple) => {
    setAnswers((prevAnswers) => {
      if (isMultiple) {
        const selectedOptions = prevAnswers[questionId] || [];
        if (selectedOptions.includes(option)) {
          return {
            ...prevAnswers,
            [questionId]: selectedOptions.filter((item) => item !== option), // Remove option if already selected
          };
        } else {
          return {
            ...prevAnswers,
            [questionId]: [...selectedOptions, option], // Add option to selected options
          };
        }
      } else {
        return {
          ...prevAnswers,
          [questionId]: option, // Set single-choice answer
        };
      }
    });
  };

  // Move to the next question
  const handleNext = () => {
    if (!isCurrentQuestionAnswered()) {
      setError("Prosím, odpovedzte na otázku pred pokračovaním."); // Show error for unanswered question
      return;
    }

    setError(null); // Clear error state
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prevIndex) => prevIndex + 1); // Increment question index
    }
  };

  if (questions.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Načitávam otázky...</p> {/* Show loading message */}
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex]; // Get the current question

  return (
    <section className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        <h1 className="text-3xl font-bold text-blue-600 mb-6">Dotazník</h1>
        {error && (
          <div className="mb-4 p-3 text-red-700 bg-red-100 border border-red-400 rounded">
            {error} {/* Display error message */}
          </div>
        )}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            {currentQuestion.text} {/* Display current question text */}
          </h3>
          {currentQuestion.options.map((option) => (
            <label key={option} className="block text-gray-600">
              <input
                type={currentQuestion.multiple ? "checkbox" : "radio"} // Use checkbox for multiple-choice, radio for single-choice
                checked={
                  currentQuestion.multiple
                    ? answers[currentQuestion.id]?.includes(option) || false // Check if option is selected
                    : answers[currentQuestion.id] === option // Check if option matches single-choice answer
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
              {option} {/* Display option text */}
            </label>
          ))}
        </div>
        <div className="flex justify-start mt-4">
          {currentQuestionIndex < questions.length - 1 ? (
            <button
              onClick={handleNext}
              disabled={!isCurrentQuestionAnswered()} // Disable button if current question is not answered
              className={`text-white font-medium rounded-lg text-sm px-5 py-2.5 ${
                isCurrentQuestionAnswered() 
                  ? "bg-blue-600 hover:bg-blue-700" 
                  : "bg-blue-400 cursor-not-allowed"
              }`}
            >
              Ďalšia otázka {/* Button for moving to the next question */}
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="text-white font-medium rounded-lg text-sm px-5 py-2.5 bg-blue-600 hover:bg-blue-700"
            >
              Odoslať odpoveď {/* Button for submitting answers */}
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

export default Questionnaire;
