import { useState, useRef, useEffect } from 'react';
import useAuth from "../hooks/useAuth";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import useLogout from "../hooks/useLogout";

// Component for rendering the navigation bar
const Navbar = () => {
  const { auth } = useAuth(); // Access authentication context
  const navigate = useNavigate(); // Navigation hook
  const logout = useLogout(); // Custom hook for logging out
  const [menuOpen, setMenuOpen] = useState(false); // State for toggling the user menu
  const menuRef = useRef(null); // Reference for the user menu

  // Handle user logout
  const handleLogout = async () => {
    await logout(); // Perform logout
    navigate("/"); // Redirect to the home page
  };

  // Toggle the visibility of the user menu
  const toggleMenu = () => {
    setMenuOpen(prev => !prev); // Toggle menu state
  };

  // Close the menu when clicking outside of it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false); // Close menu if clicked outside
      }
    };

    document.addEventListener('mousedown', handleClickOutside); // Add event listener
    return () => {
      document.removeEventListener('mousedown', handleClickOutside); // Cleanup event listener
    };
  }, []);

  return (
    <nav className="bg-blue-500 text-white shadow-md">
      <div className="container mx-auto px-2 py-2 md:px-4 md:py-3 flex justify-between items-center">
        {/* Logo and Home Link */}
        <div className="flex items-center">
          <Link to="/" className="text-l md:text-2xl font-bold">
            <span className="text-white">MovieRecommender</span> {/* Application name */}
          </Link>
        </div>

        {/* Navigation Links */}
        <div className="flex items-center space-x-2 md:space-x-4">
          {auth?.user ? (
            <div 
              className="relative" 
              ref={menuRef} // Reference for the user menu
            >
              {/* User avatar */}
              <div 
                className="w-8 h-8 md:w-10 md:h-10 bg-white text-blue-600 rounded-full flex items-center justify-center font-bold cursor-pointer"
                onClick={toggleMenu} // Toggle menu on click
                onMouseEnter={() => setMenuOpen(true)} // Open menu on hover
              >
                {auth.user.charAt(0).toUpperCase()} {/* Display first letter of username */}
              </div>

              {/* User menu */}
              <div 
                className={`absolute right-0 mt-2 w-40 md:w-48 bg-white text-gray-800 rounded-lg shadow-lg z-10 transition-opacity duration-200 ${
                  menuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none' // Show/hide menu
                }`}
                onMouseEnter={() => setMenuOpen(true)} // Keep menu open on hover
                onMouseLeave={() => setMenuOpen(false)} // Close menu on mouse leave
              >
                {/* Navigation links in the user menu */}
                <Link
                  to="/generate"
                  className="block px-3 py-1.5 md:px-4 md:py-2 hover:bg-gray-100 rounded-t-lg text-sm"
                  onClick={() => setMenuOpen(false)} // Close menu on click
                >
                  Generuj {/* Link to generate recommendations */}
                </Link>
                <Link
                  to="/liked-movies"
                  className="block px-3 py-1.5 md:px-4 md:py-2 hover:bg-gray-100 text-sm"
                  onClick={() => setMenuOpen(false)} // Close menu on click
                >
                  Obľúbené filmy {/* Link to liked movies */}
                </Link>
                <button
                  onClick={() => {
                    setMenuOpen(false); // Close menu
                    handleLogout(); // Perform logout
                  }}
                  className="block w-full text-left px-3 py-1.5 md:px-4 md:py-2 hover:bg-gray-100 rounded-b-lg text-sm"
                >
                  Odhlásiť sa {/* Logout button */}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Links for unauthenticated users */}
              <Link
                to="/login"
                className="bg-white text-blue-600 hover:bg-gray-100 px-2 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-medium"
              >
                Prihlásiť sa {/* Login link */}
              </Link>
              <Link
                to="/register"
                className="bg-blue-500 border border-solid border-white hover:bg-blue-700 text-white px-2 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-medium"
              >
                Registrovať sa {/* Register link */}
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
