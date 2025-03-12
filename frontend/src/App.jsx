import Login from './pages/Login';
import Register from './pages/Register';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

function App() {
  return (
  <main className='App'>
    <Router>
      <Routes>
        <Route path='/' element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </Router>
  </main>
  );
};

export default App
