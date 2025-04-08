import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "./Navbar";
import MovieCard from "./MovieCard";
import useAuth from "../hooks/useAuth";
import useAxiosPrivate from "../hooks/useAxiosPrivate";

const Generate = () => {
  const [ncfRecommendations, setNcfRecommendations] = useState([]);
  const [cfRecommendations, setCfRecommendations] = useState([]);
  const [ncfIndex, setNcfIndex] = useState(0);
  const [cfIndex, setCfIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [ratedMovieIds, setRatedMovieIds] = useState(() => {
    const saved = localStorage.getItem('ratedMovieIds');
    return saved ? JSON.parse(saved) : [];
  });

  const navigate = useNavigate();
  const { auth } = useAuth();
  const axiosPrivate = useAxiosPrivate();

  useEffect(() => {
    if (!auth?.accessToken) {
      navigate("/login");
      return;
    }
    fetchNextRecommendation();
  }, [auth, navigate]);

  useEffect(() => {
    localStorage.setItem('ratedMovieIds', JSON.stringify(ratedMovieIds));
  }, [ratedMovieIds]);


  const fetchNextRecommendation = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axiosPrivate.post("/recommendations");
      if (response.data) {
        const filteredNcfRecs = (response.data.ncf_recommendations || [])
          .filter(movie => !ratedMovieIds.includes(movie.itemID));
          
        const filteredCfRecs = (response.data.cf_recommendations || [])
          .filter(movie => !ratedMovieIds.includes(movie.itemID));
        
        setNcfRecommendations(filteredNcfRecs);
        setCfRecommendations(filteredCfRecs);

        setNcfIndex(0);
        setCfIndex(0);
      } else {
        setError("No more recommendations available");
      }
    } catch (err) {
      console.error("Error fetching recommendation:", err);
      setError(
        "Error loading recommendation: " +
          (err.response?.data?.message || err.message)
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLikeMovie = async (movieId) => {
    try {
      await axiosPrivate.post(`/movies/like/${movieId}`);
    } catch (err) {
      console.error("Error liking movie:", err);
    }
  };

  const handleNextNcfRecommendation = () => {
    if (ncfIndex < ncfRecommendations.length - 1) {
      setNcfIndex(ncfIndex + 1);
    } else {
      setNcfIndex(0);
    }
  };

  const handleNextCfRecommendation = () => {
    if (cfIndex < cfRecommendations.length - 1) {
      setCfIndex(cfIndex + 1);
    } else {
      setCfIndex(0);
    }
  };

  const handleSkipBoth = () => {
    handleNextNcfRecommendation();
    handleNextCfRecommendation();
  };

  const handlePreferenceSelection = async (preferred) => {
    try {

      const ncfMovieId = currentNcfRecommendation?.itemID;
      const cfMovieId = currentCfRecommendation?.itemID;

      await axiosPrivate.post("/feedback/algorithm-preference", {
        preferred_algorithm: preferred,
        ncf_movie_id: ncfMovieId,
        cf_movie_id: cfMovieId,
      });

      setFeedbackMessage("Thanks for your feedback!");

      setRatedMovieIds(prevIds => [...prevIds, ncfMovieId, cfMovieId]);

      const updatedNcfRecs = ncfRecommendations.filter(
        (movie) => movie.itemID !== ncfMovieId
      );
      const updatedCfRecs = cfRecommendations.filter(
        (movie) => movie.itemID !== cfMovieId
      );

      setNcfRecommendations(updatedNcfRecs);
      setCfRecommendations(updatedCfRecs);

      if (ncfIndex >= updatedNcfRecs.length) {
        setNcfIndex(Math.max(0, updatedNcfRecs.length - 1));
      }

      if (cfIndex >= updatedCfRecs.length) {
        setCfIndex(Math.max(0, updatedCfRecs.length - 1));
      }

      setTimeout(() => setFeedbackMessage(""), 3000);
    } catch (err) {
      console.error("Error saving preference:", err);
    }
  };

  const currentNcfRecommendation =
    ncfRecommendations.length > ncfIndex ? ncfRecommendations[ncfIndex] : null;
  const currentCfRecommendation =
    cfRecommendations.length > cfIndex ? cfRecommendations[cfIndex] : null;

  return (
    <div className="min-h-screen bg-gray-100">
      <NavBar />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 text-center">
            Your Top Recommendations
          </h1>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error && !currentNcfRecommendation && !currentCfRecommendation ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        ) : (
          <>
            {/* Comparison and Skip Controls */}
            {currentNcfRecommendation && currentCfRecommendation && (
              <div className="flex flex-col items-center justify-center bg-white rounded-lg shadow-md p-6 mb-8">
                <h3 className="text-lg font-semibold text-center mb-4">
                  Which recommendation do you prefer?
                </h3>
                <div className="flex gap-4 mb-4">
                  <button
                    onClick={() => handlePreferenceSelection("ncf")}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-full"
                  >
                    Movie A
                  </button>
                  <button
                    onClick={() => handlePreferenceSelection("cf")}
                    className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-6 rounded-full"
                  >
                    Movie B
                  </button>
                </div>

                <button
                  onClick={handleSkipBoth}
                  className="mt-2 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-6 rounded-full"
                >
                  Skip Both
                </button>

                {feedbackMessage && (
                  <div className="mt-3 text-sm font-medium text-gray-600">
                    {feedbackMessage}
                  </div>
                )}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* NCF Recommendations */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-center mb-4">
                  <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full mb-2">
                    Movie A
                  </span>
                </h2>

                {currentNcfRecommendation ? (
                  <div className="flex flex-col items-center">
                    <MovieCard
                      movie={currentNcfRecommendation}
                      onLike={() =>
                        handleLikeMovie(currentNcfRecommendation.itemID)
                      }
                    />
                    <div className="mt-4 text-gray-600 text-sm">
                      {ncfIndex + 1} of {ncfRecommendations.length}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">
                      No neural recommendations available
                    </p>
                  </div>
                )}
              </div>

              {/* CF Recommendations */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-center mb-4">
                  <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full mb-2">
                    Movie B
                  </span>
                </h2>

                {currentCfRecommendation ? (
                  <div className="flex flex-col items-center">
                    <MovieCard
                      movie={currentCfRecommendation}
                      onLike={() =>
                        handleLikeMovie(currentCfRecommendation.itemID)
                      }
                    />
                    <div className="mt-4 text-gray-600 text-sm">
                      {cfIndex + 1} of {cfRecommendations.length}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">
                      No user-based recommendations available
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Generate;
