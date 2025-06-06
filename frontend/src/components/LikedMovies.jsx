import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from './Navbar';
import useAuth from "../hooks/useAuth";
import useAxiosPrivate from "../hooks/useAxiosPrivate";
import { FaTrash } from 'react-icons/fa';

// Component for displaying and managing liked movies
const LikedMovies = () => {
  const [likedMovies, setLikedMovies] = useState([]); // State for liked movies
  const [loading, setLoading] = useState(true); // Loading state
  const [error, setError] = useState(null); // Error state
  const navigate = useNavigate(); // Navigation hook
  const { auth } = useAuth(); // Access authentication context
  const axiosPrivate = useAxiosPrivate(); // Axios instance for private requests

  useEffect(() => {
    if (!auth?.accessToken) {
      navigate('/login'); // Redirect to login if not authenticated
      return;
    }
    
    fetchLikedMovies(); // Fetch liked movies
  }, [auth, navigate]);
  
  const fetchLikedMovies = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axiosPrivate.get('/movies/liked'); // Fetch liked movies from backend
      setLikedMovies(response.data); // Update state with liked movies
    } catch (err) {
      console.error('Error fetching liked movies:', err); // Log errors
      setError('Error loading liked movies: ' + (err.response?.data?.message || err.message)); // Set error state
    } finally {
      setLoading(false); // Reset loading state
    }
  };
  
  const handleUnlike = async (movieId) => {
    try {
      await axiosPrivate.delete(`/movies/unlike/${movieId}`); // Remove movie from liked list
      setLikedMovies(prev => prev.filter(movie => movie.movieId !== movieId)); // Update state
    } catch (err) {
      console.error('Error unliking movie:', err); // Log errors
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-100">
      <NavBar />
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Vaše obľúbené filmy</h1>
        
        {loading && (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        )}
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {!loading && !error && likedMovies.length === 0 && (
          <div className="text-center py-10 bg-white rounded-lg shadow-md">
            <p className="text-xl text-gray-600 mb-4">Zatiaľ nemáte žiadne obľúbené filmy.</p>
            <button 
              onClick={() => navigate('/generate')}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
            >
              Získať odporúčania
            </button>
          </div>
        )}
        
        <div className="grid grid-cols-1 gap-4">
          {likedMovies.map(movie => (
            <div 
              key={movie.movieId}
              className="bg-white rounded-lg p-4 shadow-md flex justify-between items-center"
            >
              <div>
                <h3 className="text-lg font-semibold text-gray-800">{movie.title}</h3>
              </div>
              
              <button 
                onClick={() => handleUnlike(movie.movieId)}
                className="text-red-500 hover:text-red-600 p-2 rounded-full hover:bg-red-100"
                title="Remove from liked movies"
              >
                <FaTrash />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LikedMovies;