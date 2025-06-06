// Importing components for different pages of the application
import Questionnaire from './components/Questionnaire';
import Login from './components/Login';
import Register from './components/Register';
import { HashRouter as Router, Routes, Route } from 'react-router-dom'; // Importing routing utilities
import Home from './components/Home';
import RateMovies from './components/RateMovies';
import Generate from './components/Generate';
import LikedMovies from './components/LikedMovies';

function App() {
  return (
    <main className='App'>
      {/* Setting up the router for navigation */}
      <Router>
        <Routes>
          {/* Defining routes for different pages */}
          <Route path='/' element={<Home />} /> {/* Home page */}
          <Route path='/login' element={<Login />} /> {/* Login page */}
          <Route path="/register" element={<Register />} /> {/* Registration page */}
          <Route path='/survey/questions' element={<Questionnaire />} /> {/* Questionnaire page */}
          <Route path='/survey/film-rating' element={<RateMovies />} /> {/* Film rating page */}
          <Route path='/generate' element={<Generate />} /> {/* Generate recommendations page */}
          <Route path='/liked-movies' element={<LikedMovies />} /> {/* Liked movies page */}
        </Routes>
      </Router>
    </main>
  );
};

export default App; // Exporting the App component
