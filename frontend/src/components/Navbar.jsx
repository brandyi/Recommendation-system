import useAuth from "../hooks/useAuth";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import useLogout from "../hooks/useLogout";

const Navbar = () => {
  const { auth } = useAuth();
  const navigate = useNavigate();
  const logout = useLogout();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };
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
            <div className="relative group">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-white text-blue-600 rounded-full flex items-center justify-center font-bold cursor-pointer">
                {auth.user.charAt(0).toUpperCase()}
              </div>

              <div className="absolute right-0 mt-2 w-40 md:w-48 bg-white text-gray-800 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                <Link
                  to="/generate"
                  className="block px-3 py-1.5 md:px-4 md:py-2 hover:bg-gray-100 rounded-t-lg text-sm"
                >
                  Generuj
                </Link>
                <Link
                  to="/liked-movies"
                  className="block px-3 py-1.5 md:px-4 md:py-2 hover:bg-gray-100 text-sm"
                >
                  Obľúbené filmy
                </Link>
                <button
                  onClick={handleLogout}
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
