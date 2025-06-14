// Importing React hooks for state management and side effects
import { useState, useEffect } from "react";
// Importing navigation hook for redirecting users
import { useNavigate } from "react-router-dom";
// Importing components for UI
import NavBar from "./Navbar";
import MovieCard from "./MovieCard";
// Importing custom hooks for authentication and Axios instance
import useAuth from "../hooks/useAuth";
import useAxiosPrivate from "../hooks/useAxiosPrivate";
// Importing icons for navigation buttons
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

// Helper function to shuffle an array
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const Generate = () => {
  // State variables for recommendations, indices, loading, and error handling
  const [ncfRecommendations, setNcfRecommendations] = useState([]);
  const [cfRecommendations, setCfRecommendations] = useState([]);
  const [ncfIndex, setNcfIndex] = useState(0);
  const [cfIndex, setCfIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [ncfIsGroupA, setNcfIsGroupA] = useState(true); // Track which group is assigned as Group A

  // Hooks for navigation and authentication
  const navigate = useNavigate();
  const { auth } = useAuth();
  const axiosPrivate = useAxiosPrivate();

  useEffect(() => {
    // Redirect to login if user is not authenticated
    if (!auth?.accessToken) {
      navigate("/login");
      return;
    } 
    
    // Check if user has already voted
    if (localStorage.getItem(`${auth.user}_has_voted`) === 'true') {
      setHasVoted(true);
    }
    
    // Randomly decide which algorithm appears as Group A
    const randomizeGroups = () => {
      const isNcfGroupA = Math.random() < 0.5;
      setNcfIsGroupA(isNcfGroupA);
      // Store this decision to keep it consistent in the session
      localStorage.setItem(`${auth.user}_ncf_is_group_a`, isNcfGroupA.toString());
    };
    
    if (
      localStorage.getItem(`${auth.user}_ncf_recommendations`) &&
      localStorage.getItem(`${auth.user}_cf_recommendations`)
    ) {
      const loadAndSyncRecommendations = async () => {
        const ncfRecs = JSON.parse(
          localStorage.getItem(`${auth.user}_ncf_recommendations`)
        );
        const cfRecs = JSON.parse(
          localStorage.getItem(`${auth.user}_cf_recommendations`)
        );

        // Get the stored group assignment or randomize if not set
        const storedNcfIsGroupA = localStorage.getItem(`${auth.user}_ncf_is_group_a`);
        if (storedNcfIsGroupA !== null) {
          setNcfIsGroupA(storedNcfIsGroupA === 'true');
        } else {
          randomizeGroups();
        }

        // Sync with current liked status but maintain the same order
        const syncedNcfRecs = await syncUserData(ncfRecs);
        const syncedCfRecs = await syncUserData(cfRecs);

        // Use the already stored order, don't re-shuffle
        setNcfRecommendations(syncedNcfRecs);
        setCfRecommendations(syncedCfRecs);
        setNcfIndex(0);
        setCfIndex(0);
        setLoading(false);
      };

      loadAndSyncRecommendations();
      return;
    }
    
    // Randomize group assignment for new recommendations
    randomizeGroups();
    fetchNextRecommendation();
  }, [auth, navigate]);

  const syncLikedStatus = async (recommendations) => {
    try {
      // Fetch liked movies from the backend
      const response = await axiosPrivate.get("/movies/liked");
      const likedMovieIds = response.data.map((movie) => movie.movieId);

      // Update recommendations with liked status
      return recommendations.map((movie) => ({
        ...movie,
        isLiked: likedMovieIds.includes(movie.itemID),
      }));
    } catch (err) {
      console.error("Error syncing liked status:", err);
      return recommendations;
    }
  };

  const syncUserData = async (recommendations) => {
    try {
      // Fetch liked movies and ratings from the backend
      const likedResponse = await axiosPrivate.get("/movies/liked");
      const likedMovieIds = likedResponse.data.map((movie) => movie.movieId);
      
      // Get watch likelihood ratings
      const ratingsResponse = await axiosPrivate.get("/feedback/movie-ratings");
      
      // Create lookup maps for each algorithm's ratings
      const ncfRatings = {};
      const cfRatings = {};
      
      if (ratingsResponse.data) {
        ratingsResponse.data.forEach(item => {
          if (item.movie_rating_ncf && item.ncf_movie_id) {
            ncfRatings[item.ncf_movie_id] = item.movie_rating_ncf;
          }
          if (item.movie_rating_cf && item.cf_movie_id) {
            cfRatings[item.cf_movie_id] = item.movie_rating_cf;
          }
        });
      }

      // Apply ratings based on movie source
      return recommendations.map((movie) => {
        const isNcf = movie.source === "neural_cf";
        return {
          ...movie,
          isLiked: likedMovieIds.includes(movie.itemID),
          watchLikelihood: isNcf 
            ? ncfRatings[movie.itemID] || movie.watchLikelihood || 0
            : cfRatings[movie.itemID] || movie.watchLikelihood || 0
        };
      });
    } catch (err) {
      console.error("Error syncing user data:", err);
      return recommendations;
    }
  };

  const fetchNextRecommendation = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch recommendations from the backend
      const response = await axiosPrivate.post("/recommendations");
      if (response.data) {
        // Sync liked status and shuffle recommendations
        const ncfWithLikes = await syncLikedStatus(
          response.data.ncf_recommendations
        );
        const cfWithLikes = await syncLikedStatus(
          response.data.cf_recommendations
        );

        // Only shuffle if we don't already have an order for this user
        let shuffledNcf = ncfWithLikes;
        let shuffledCf = cfWithLikes;
        
        // First time only - create a random order for the movies
        if (!localStorage.getItem(`${auth.user}_ncf_recommendations`)) {
          shuffledNcf = shuffleArray(ncfWithLikes);
          shuffledCf = shuffleArray(cfWithLikes);
        }

        setNcfRecommendations(shuffledNcf);
        setCfRecommendations(shuffledCf);
        setNcfIndex(0);
        setCfIndex(0);

        // Store the ordered recommendations in localStorage
        localStorage.setItem(
          `${auth.user}_ncf_recommendations`,
          JSON.stringify(shuffledNcf)
        );
        localStorage.setItem(
          `${auth.user}_cf_recommendations`,
          JSON.stringify(shuffledCf)
        );

        // Check if the user has already voted
        const response2 = await axiosPrivate.get("/feedback/voted");
        if (response2.data.voted === true) {
          localStorage.setItem(`${auth.user}_has_voted`, 'true');
          setHasVoted(true);
        } else {
          setHasVoted(false);
        }
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

  // Function to handle liking a movie
  const handleLikeMovie = async (movieId) => {
    try {
      await axiosPrivate.post(`/movies/like/${movieId}`);

      // Update local state and persist changes in localStorage
      setNcfRecommendations((prev) =>
        prev.map((movie) =>
          movie.itemID === movieId
            ? { ...movie, isLiked: !movie.isLiked }
            : movie
        )
      );

      setCfRecommendations((prev) =>
        prev.map((movie) =>
          movie.itemID === movieId
            ? { ...movie, isLiked: !movie.isLiked }
            : movie
        )
      );

      // Update localStorage to persist changes
      localStorage.setItem(
        `${auth.user}_ncf_recommendations`,
        JSON.stringify(
          ncfRecommendations.map((movie) =>
            movie.itemID === movieId
              ? { ...movie, isLiked: !movie.isLiked }
              : movie
          )
        )
      );

      localStorage.setItem(
        `${auth.user}_cf_recommendations`,
        JSON.stringify(
          cfRecommendations.map((movie) =>
            movie.itemID === movieId
              ? { ...movie, isLiked: !movie.isLiked }
              : movie
          )
        )
      );
    } catch (err) {
      console.error("Error liking movie:", err);
    }
  };

  // Function to handle rating a movie's watch likelihood
  const handleRateWatchLikelihood = async (movieId, rating) => {
    try {
      // Check if this movie exists in each recommendation set
      const isInNcf = ncfRecommendations.some(movie => movie.itemID === movieId);
      const isInCf = cfRecommendations.some(movie => movie.itemID === movieId);
      
      // Find the same movie in the other recommendation set (if it exists)
      let sameMovieInOtherSet = null;
      if (isInNcf && isInCf) {
        // If this movie appears in both sets, get the other instance
        if (ncfRecommendations.some(movie => movie.itemID === movieId)) {
          sameMovieInOtherSet = cfRecommendations.find(movie => movie.itemID === movieId);
        } else {
          sameMovieInOtherSet = ncfRecommendations.find(movie => movie.itemID === movieId);
        }
      }
      
      // Prepare rating data for backend
      // First determine which set and index the movie is in
      const ncfIndex = ncfRecommendations.findIndex(movie => movie.itemID === movieId);
      const cfIndex = cfRecommendations.findIndex(movie => movie.itemID === movieId);
      
      // Get the actual index to use
      const activeIndex = ncfIndex !== -1 ? ncfIndex : cfIndex;
      
      // Get IDs at the matching positions in both arrays
      const ncfMovieId = ncfRecommendations[activeIndex]?.itemID || 
                        (ncfRecommendations.length > 0 ? ncfRecommendations[0].itemID : movieId);
                        
      const cfMovieId = cfRecommendations[activeIndex]?.itemID || 
                         (cfRecommendations.length > 0 ? cfRecommendations[0].itemID : movieId);
      
      // Prepare rating data for backend - no more nulls
      const ratingData = {
        ncf_movie_id: ncfMovieId,
        cf_movie_id: cfMovieId,
        movie_rating_ncf: isInNcf ? rating : null,
        movie_rating_cf: isInCf ? rating : null
      };
      
      // Send rating to backend
      await axiosPrivate.post('/feedback/rate-movie', ratingData);

      // Update NCF recommendations if applicable
      if (isInNcf) {
        setNcfRecommendations(prev => 
          prev.map(movie => 
            movie.itemID === movieId 
              ? { ...movie, watchLikelihood: rating } 
              : movie
          )
        );
        
        // Update localStorage for NCF
        localStorage.setItem(
          `${auth.user}_ncf_recommendations`,
          JSON.stringify(
            ncfRecommendations.map(movie => 
              movie.itemID === movieId 
                ? { ...movie, watchLikelihood: rating } 
                : movie
            )
          )
        );
      }

      // Update CF recommendations if applicable
      if (isInCf) {
        setCfRecommendations(prev => 
          prev.map(movie => 
            movie.itemID === movieId 
              ? { ...movie, watchLikelihood: rating } 
              : movie
          )
        );
        
        // Update localStorage for CF
        localStorage.setItem(
          `${auth.user}_cf_recommendations`,
          JSON.stringify(
            cfRecommendations.map(movie => 
              movie.itemID === movieId 
                ? { ...movie, watchLikelihood: rating } 
                : movie
            )
          )
        );
      }
    } catch (err) {
      console.error("Error rating movie watch likelihood:", err);
    }
  };

  // Functions to navigate through recommendations
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

  const handlePrevNcfRecommendation = () => {
    if (ncfIndex > 0) {
      setNcfIndex(ncfIndex - 1);
    } else {
      setNcfIndex(ncfRecommendations.length - 1);
    }
  };

  const handlePrevCfRecommendation = () => {
    if (cfIndex > 0) {
      setCfIndex(cfIndex - 1);
    } else {
      setCfIndex(cfRecommendations.length - 1);
    }
  };

  // Function to handle preference selection between groups
  const handlePreferenceSelection = async (selectedGroup) => {
    try {
      const ncf_movies_ids = ncfRecommendations.map((movie) => movie.itemID);
      const cf_movies_ids = cfRecommendations.map((movie) => movie.itemID);
      
      // Map the selected group to the corresponding algorithm
      const preferred = (selectedGroup === "A" && ncfIsGroupA) || 
                        (selectedGroup === "B" && !ncfIsGroupA) 
                        ? "ncf" : "cf";

      await axiosPrivate.post("/feedback/algorithm-preference", {
        preferred_algorithm: preferred,
        ncf_movies_ids: ncf_movies_ids,
        cf_movies_ids: cf_movies_ids,
      });

      // Store that the user has voted
      localStorage.setItem(`${auth.user}_has_voted`, 'true');
      setHasVoted(true);
    } catch (err) {
      console.error("Error saving preference:", err);
    }
  };

  // Determine current recommendations for each group
  const currentNcfRecommendation =
    ncfRecommendations.length > ncfIndex ? ncfRecommendations[ncfIndex] : null;
  const currentCfRecommendation =
    cfRecommendations.length > cfIndex ? cfRecommendations[cfIndex] : null;

  // Determine which recommendations to show in Group A and Group B
  const groupA = ncfIsGroupA ? {
    recommendations: ncfRecommendations,
    current: currentNcfRecommendation,
    index: ncfIndex,
    handleNext: handleNextNcfRecommendation,
    handlePrev: handlePrevNcfRecommendation,
    color: "blue"
  } : {
    recommendations: cfRecommendations,
    current: currentCfRecommendation,
    index: cfIndex,
    handleNext: handleNextCfRecommendation,
    handlePrev: handlePrevCfRecommendation,
    color: "blue"
  };

  const groupB = ncfIsGroupA ? {
    recommendations: cfRecommendations,
    current: currentCfRecommendation,
    index: cfIndex,
    handleNext: handleNextCfRecommendation,
    handlePrev: handlePrevCfRecommendation,
    color: "green"
  } : {
    recommendations: ncfRecommendations,
    current: currentNcfRecommendation,
    index: ncfIndex,
    handleNext: handleNextNcfRecommendation,
    handlePrev: handlePrevNcfRecommendation, 
    color: "green"
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <NavBar />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 text-center">
            Najlepšie odporúčania pre teba
          </h1>
        </div>

        {loading ? (
          <div className="flex flex-col justify-center items-center h-64 space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            <p className="text-gray-700 text-center font-medium">
              Načítavam odporúčania, môže to trvať aj niekoľko minút...
            </p>
          </div>
        ) : error && !currentNcfRecommendation && !currentCfRecommendation ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        ) : (
          <>
            {/* Comparison and Vote Controls or Thank You Message */}
            {currentNcfRecommendation && currentCfRecommendation && (
              <div className="flex flex-col items-center justify-center bg-white rounded-lg shadow-md p-6 mb-8">
                {hasVoted ? (
                  // Thank you message
                  <div className="flex flex-col items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-green-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">Ďakujem za tvoju spätnú väzbu!</h2>
                    <p className="text-lg text-gray-600 text-center">
                      Tvoje hodnotenie bolo úspešne zaznamenané. Tieto informácie mi pomôžu zlepšiť kvalitu odporúčaní.
                    </p>
                  </div>
                ) : (
                  // Voting instructions and buttons
                  <>
                    <h3 className="text-lg text-center mb-6 max-w-3xl mx-auto leading-relaxed">
                      <span className="font-bold">Pozorne</span> si prezri obidve
                      skupiny filmov. Každá skupina obsahuje po{" "}
                      <span className="font-bold">10 filmov</span>.
                      <br />
                      Pri každom filme mi prosím ohodnoť ako veľmi by si si tento film pozrel. Taktiež po prezrení obidvoch skupín prosím daj vedieť, ktorá skupina sa ti páčila viac, tlačídlami hneď pod týmto textom. Dávaj pozor, po kliknutí na tlačidlo už nie je možné hodnotenie zmeniť.
                    </h3>
                    <div className="flex gap-4 mb-4">
                      <button
                        onClick={() => handlePreferenceSelection("A")}
                        className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-full"
                      >
                        Vybrať skupinu A
                      </button>
                      <button
                        onClick={() => handlePreferenceSelection("B")}
                        className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-6 rounded-full"
                      >
                        Vybrať skupinu B
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Movie recommendations - always shown when available */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Group A recommendations */}
              <div className="bg-white rounded-lg shadow-md p-3 md:p-6">
                <h2 className="text-xl font-semibold text-center mb-4">
                  <span className={`inline-block bg-${groupA.color}-100 text-${groupA.color}-800 px-3 py-1 rounded-full mb-2`}>
                    Skupina A
                  </span>
                </h2>

                {groupA.current ? (
                  <div className="flex flex-col items-center">
                    <div className="w-full flex items-center justify-between">
                      <button
                        onClick={groupA.handlePrev}
                        className={`bg-${groupA.color}-100 hover:bg-${groupA.color}-200 text-${groupA.color}-800 rounded-full p-2 focus:outline-none`}
                        aria-label="Previous movie"
                      >
                        <FaChevronLeft size={20} />
                      </button>

                      <div className="flex-grow mx-4">
                        <MovieCard
                          movie={groupA.current}
                          onLike={() => handleLikeMovie(groupA.current.itemID)}
                          onRateWatchLikelihood={handleRateWatchLikelihood}
                        />
                      </div>

                      <button
                        onClick={groupA.handleNext}
                        className={`bg-${groupA.color}-100 hover:bg-${groupA.color}-200 text-${groupA.color}-800 rounded-full p-2 focus:outline-none`}
                        aria-label="Next movie"
                      >
                        <FaChevronRight size={20} />
                      </button>
                    </div>

                    <div className={`mt-4 bg-${groupA.color}-100 text-${groupA.color}-800 px-4 py-2 rounded-full font-medium text-base inline-flex items-center justify-center`}>
                      <span className="font-bold">{groupA.index + 1}</span>
                      <span className="mx-1">z</span>
                      <span className="font-bold">
                        {groupA.recommendations.length}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">
                      No recommendations available for Group A
                    </p>
                  </div>
                )}
              </div>

              {/* Group B recommendations */}
              <div className="bg-white rounded-lg shadow-md p-3 md:p-6">
                <h2 className="text-xl font-semibold text-center mb-4">
                  <span className={`inline-block bg-${groupB.color}-100 text-${groupB.color}-800 px-3 py-1 rounded-full mb-2`}>
                    Skupina B
                  </span>
                </h2>

                {groupB.current ? (
                  <div className="flex flex-col items-center">
                    <div className="w-full flex items-center justify-between">
                      <button
                        onClick={groupB.handlePrev}
                        className={`bg-${groupB.color}-100 hover:bg-${groupB.color}-200 text-${groupB.color}-800 rounded-full p-2 focus:outline-none`}
                        aria-label="Previous movie"
                      >
                        <FaChevronLeft size={20} />
                      </button>

                      <div className="flex-grow mx-4">
                        <MovieCard
                          movie={groupB.current}
                          onLike={() => handleLikeMovie(groupB.current.itemID)}
                          onRateWatchLikelihood={handleRateWatchLikelihood}
                        />
                      </div>

                      <button
                        onClick={groupB.handleNext}
                        className={`bg-${groupB.color}-100 hover:bg-${groupB.color}-200 text-${groupB.color}-800 rounded-full p-2 focus:outline-none`}
                        aria-label="Next movie"
                      >
                        <FaChevronRight size={20} />
                      </button>
                    </div>

                    <div className={`mt-4 bg-${groupB.color}-100 text-${groupB.color}-800 px-4 py-2 rounded-full font-medium text-base inline-flex items-center justify-center`}>
                      <span className="font-bold">{groupB.index + 1}</span>
                      <span className="mx-1">z</span>
                      <span className="font-bold">
                        {groupB.recommendations.length}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">
                      No recommendations available for Group B
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
