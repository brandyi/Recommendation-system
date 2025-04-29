import Questionnaire from './components/Questionnaire';
import Login from './components/Login';
import Register from './components/Register';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import RateMovies from './components/RateMovies';
import Generate from './components/Generate';
import LikedMovies from './components/LikedMovies';

function App() {
  return (
  <main className='App'>
    <Router>
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/login' element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path='/survey/questions' element={<Questionnaire />} />
        <Route path='/survey/film-rating' element={<RateMovies />} />
        <Route path='/generate' element={<Generate />} />
        <Route path='/liked-movies' element={<LikedMovies />} />
      </Routes>
    </Router>
  </main>
  );
};

export default App
