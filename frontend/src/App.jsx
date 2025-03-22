import Questionnaire from './components/Questionnaire';
import Login from './components/Login';
import Register from './components/Register';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './components/Home';

function App() {
  return (
  <main className='App'>
    <Router>
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/login' element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path='/survey' element={<Questionnaire />} />
      </Routes>
    </Router>
  </main>
  );
};

export default App
