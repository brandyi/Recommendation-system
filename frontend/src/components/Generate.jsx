import { useState, useEffect} from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "./Navbar";
import MovieCard from "./MovieCard";
import useAuth from "../hooks/useAuth";
import useAxiosPrivate from "../hooks/useAxiosPrivate";
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
  const [ncfRecommendations, setNcfRecommendations] = useState([]);
  const [cfRecommendations, setCfRecommendations] = useState([]);
  const [ncfIndex, setNcfIndex] = useState(0);
  const [cfIndex, setCfIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [ncfIsGroupA, setNcfIsGroupA] = useState(true); // Track which group is which

  const navigate = useNavigate();
  const { auth } = useAuth();
  const axiosPrivate = useAxiosPrivate();

  useEffect(() => {
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
      const response = await axiosPrivate.get("/movies/liked");
      const likedMovieIds = response.data.map((movie) => movie.movieId);

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
      // Get liked movies
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
      const response = await axiosPrivate.post("/recommendations");
      if (response.data) {
        // Sync liked status with backend
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

  // Update the handleLikeMovie function to maintain local state
  const handleLikeMovie = async (movieId) => {
    try {
      await axiosPrivate.post(`/movies/like/${movieId}`);

      // Update local state to reflect the like action
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

  // Add/update the handleRateWatchLikelihood function
  const handleRateWatchLikelihood = async (movieId, rating) => {
    try {
      // Determine which algorithm this movie belongs to
      const isNcfMovie = ncfRecommendations.some(movie => movie.itemID === movieId);
      const isCfMovie = cfRecommendations.some(movie => movie.itemID === movieId);
      
      // Find corresponding movie in the other algorithm (if it exists)
      let ncfMovieId = isNcfMovie ? movieId : null;
      let cfMovieId = isCfMovie ? movieId : null;
      
      // Get the index of the current movie in its group
      const currentIndex = isNcfMovie 
        ? ncfRecommendations.findIndex(movie => movie.itemID === movieId)
        : cfRecommendations.findIndex(movie => movie.itemID === movieId);
      
      // If we found the index, try to find the corresponding movie in the other algorithm
      if (currentIndex !== -1) {
        if (isNcfMovie && cfRecommendations.length > currentIndex) {
          cfMovieId = cfRecommendations[currentIndex].itemID;
        } else if (isCfMovie && ncfRecommendations.length > currentIndex) {
          ncfMovieId = ncfRecommendations[currentIndex].itemID;
        }
      }
      
      // Send rating to backend
      await axiosPrivate.post('/feedback/rate-movie', {
        ncf_movie_id: ncfMovieId,
        cf_movie_id: cfMovieId,
        movie_rating_ncf: isNcfMovie ? rating : null,
        movie_rating_cf: isCfMovie ? rating : null
      });

      // Update local state to reflect the new rating
      setNcfRecommendations(prev => 
        prev.map(movie => 
          movie.itemID === ncfMovieId 
            ? { ...movie, watchLikelihood: isNcfMovie ? rating : movie.watchLikelihood } 
            : movie
        )
      );

      setCfRecommendations(prev => 
        prev.map(movie => 
          movie.itemID === cfMovieId 
            ? { ...movie, watchLikelihood: isCfMovie ? rating : movie.watchLikelihood } 
            : movie
        )
      );

      // Update localStorage to persist changes
      localStorage.setItem(
        `${auth.user}_ncf_recommendations`,
        JSON.stringify(
          ncfRecommendations.map(movie => 
            movie.itemID === ncfMovieId 
              ? { ...movie, watchLikelihood: isNcfMovie ? rating : movie.watchLikelihood } 
              : movie
          )
        )
      );

      localStorage.setItem(
        `${auth.user}_cf_recommendations`,
        JSON.stringify(
          cfRecommendations.map(movie => 
            movie.itemID === cfMovieId 
              ? { ...movie, watchLikelihood: isCfMovie ? rating : movie.watchLikelihood } 
              : movie
          )
        )
      );
    } catch (err) {
      console.error("Error rating movie watch likelihood:", err);
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
                      Tvoje hodnotenie bolo úspešne zaznamenané. Tieto informácie my pomôžu zlepšiť kvalitu odporúčaní.
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
                      Po prezrení obidvoch skupín prosím daj vedieť, ktorá skupina
                      sa ti páčila viac, tlačídlami hneď pod týmto textom. Dávaj pozor, po kliknutí na tlačidlo už nie je možné hodnotenie zmeniť.
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
