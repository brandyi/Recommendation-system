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
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center">
          <Link to="/" className="text-2xl font-bold">
            <span className="text-white">MovieRecommender</span>
          </Link>
        </div>

        <div className="flex items-center space-x-4">
          {auth?.user ? (
            <div className="relative group">
            <div className="w-10 h-10 bg-white text-blue-600 rounded-full flex items-center justify-center font-bold cursor-pointer">
              {auth.user.charAt(0).toUpperCase()}
            </div>

            <div className="absolute right-0 mt-2 w-48 bg-white text-gray-800 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
              <Link
                to="/liked-movies"
                className="block px-4 py-2 hover:bg-gray-100 rounded-t-lg"
              >
                Liked Movies
              </Link>
              <button
                onClick={handleLogout}
                className="block w-full text-left px-4 py-2 hover:bg-gray-100 rounded-b-lg"
              >
                Logout
              </button>
            </div>
          </div>
          ) : (
            <>
              <Link
                to="/login"
                className="bg-white text-blue-600 hover:bg-gray-100 px-4 py-2 rounded-lg text-sm font-medium"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="bg-blue-500 border-1 border-solid border-white hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
