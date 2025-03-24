import Questionnaire from './components/Questionnaire';
import Login from './components/Login';
import Register from './components/Register';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import RateMovies from './components/RateMovies';

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
      </Routes>
    </Router>
  </main>
  );
};

export default App
