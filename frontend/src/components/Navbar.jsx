import { useState, useRef, useEffect } from 'react';
import useAuth from "../hooks/useAuth";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import useLogout from "../hooks/useLogout";

const Navbar = () => {
  const { auth } = useAuth();
  const navigate = useNavigate();
  const logout = useLogout();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const toggleMenu = () => {
    setMenuOpen(prev => !prev);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <nav className="bg-blue-500 text-white shadow-md">
      <div className="container mx-auto px-2 py-2 md:px-4 md:py-3 flex justify-between items-center">
        <div className="flex items-center">
          <Link to="/" className="text-xl md:text-2xl font-bold">
            <span className="text-white">MovieRecommender</span>
          </Link>
        </div>

        <div className="flex items-center space-x-2 md:space-x-4">
          {auth?.user ? (
            <div 
              className="relative" 
              ref={menuRef}
            >
              <div 
                className="w-8 h-8 md:w-10 md:h-10 bg-white text-blue-600 rounded-full flex items-center justify-center font-bold cursor-pointer"
                onClick={toggleMenu}
                onMouseEnter={() => setMenuOpen(true)}
              >
                {auth.user.charAt(0).toUpperCase()}
              </div>

              {/* Modified menu - add pointer events even when invisible */}
              <div 
                className={`absolute right-0 mt-2 w-40 md:w-48 bg-white text-gray-800 rounded-lg shadow-lg z-10 transition-opacity duration-200 ${
                  menuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                onMouseEnter={() => setMenuOpen(true)}
                onMouseLeave={() => setMenuOpen(false)}
              >
                <Link
                  to="/generate"
                  className="block px-3 py-1.5 md:px-4 md:py-2 hover:bg-gray-100 rounded-t-lg text-sm"
                  onClick={() => setMenuOpen(false)}
                >
                  Generuj
                </Link>
                <Link
                  to="/liked-movies"
                  className="block px-3 py-1.5 md:px-4 md:py-2 hover:bg-gray-100 text-sm"
                  onClick={() => setMenuOpen(false)}
                >
                  Obľúbené filmy
                </Link>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    handleLogout();
                  }}
                  className="block w-full text-left px-3 py-1.5 md:px-4 md:py-2 hover:bg-gray-100 rounded-b-lg text-sm"
                >
                  Odhlásiť sa
                </button>
              </div>
            </div>
          ) : (
            <>
              <Link
                to="/login"
                className="bg-white text-blue-600 hover:bg-gray-100 px-2 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-medium"
              >
                Prihlásiť sa
              </Link>
              <Link
                to="/register"
                className="bg-blue-500 border border-solid border-white hover:bg-blue-700 text-white px-2 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-medium"
              >
                Registrovať sa
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
