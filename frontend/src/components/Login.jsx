import { useEffect, useRef, useState, useContext } from "react";
import axios from "../api/axios.js";
import AuthContext from "../context/authProvider.jsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import { Link, useNavigate, useLocation, replace } from "react-router-dom";

// Component for user login
const Login = () => {
  const { setAuth } = useContext(AuthContext); // Access authentication context

  const userRef = useRef(); // Reference for username input
  const errRef = useRef(); // Reference for error message

  const navigate = useNavigate(); // Navigation hook
  const location = useLocation(); // Location hook
  const from = location?.state?.from.pathname || "/survey/questions/"; // Redirect path after login

  const [user, setUser] = useState(""); // State for username
  const [pwd, setPwd] = useState(""); // State for password
  const [showPwd, setShowPwd] = useState(false); // State for toggling password visibility
  const [errMsg, setErrMsg] = useState(""); // State for error messages

  useEffect(() => {
    userRef.current.focus(); // Focus on username input when component mounts
  }, []);

  useEffect(() => {
    setErrMsg(""); // Clear error message when username or password changes
  }, [user, pwd]);

  // Handle form submission for login
  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent default form submission

    try {
      const response = await axios.post(
        "/auth",
        JSON.stringify({ user, pwd }), // Send username and password to the server
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: true, // Include credentials for cross-origin requests
        }
      );
      const accessToken = response?.data?.accessToken; // Extract access token from response
      setAuth({ user, pwd, accessToken }); // Update authentication context
      setUser(""); // Clear username state
      setPwd(""); // Clear password state
      navigate(from, { replace: true }); // Redirect to the specified path
    } catch (err) {
      if (!err?.response) {
        setErrMsg("No server response."); // Handle server connection errors
      } else if (err?.response?.status === 400) {
        setErrMsg("Missing username or password."); // Handle missing credentials
      } else if (err?.response?.status === 401) {
        setErrMsg("Unauthorized."); // Handle invalid credentials
      } else {
        setErrMsg("Login failed."); // Handle other errors
      }
    }
  };

  return (
    <section className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        {/* Error message */}
        <div className={errMsg ? "border-2 border-red-500 p-4 mb-4" : "hidden"}>
          <p ref={errRef} className="text-red-500" aria-live="assertive">
            {errMsg}
          </p>
        </div>

        {/* Login form */}
        <h1 className="text-3xl font-bold text-blue-600 mb-6">Prihlásenie</h1>
        <form onSubmit={handleSubmit}>
          {/* Username input */}
          <div
            className={
              "relative z-0 w-full mb-3 group border-b-2 border-gray-300"
            }
          >
            <input
              type="text"
              name="floating_username"
              id="floating_username"
              className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent focus:outline-none focus:ring-0 peer"
              placeholder=" "
              required
              ref={userRef} // Reference for focusing
              autoComplete="off" // Disable autocomplete
              onChange={(e) => setUser(e.target.value)} // Update username state
            />
            <label
              htmlFor="floating_username"
              className="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
            >
              Meno {/* Label for username */}
            </label>
          </div>

          {/* Password input */}
          <div
            className={
              "relative z-0 w-full mb-3 group border-b-2 border-gray-300"
            }
          >
            <input
              type={showPwd ? "text" : "password"} // Toggle password visibility
              name="floating_password"
              id="floating_password"
              className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent focus:outline-none focus:ring-0 peer"
              placeholder=" "
              required
              autoComplete="off" // Disable autocomplete
              onChange={(e) => setPwd(e.target.value)} // Update password state
            />
            <label
              htmlFor="floating_password"
              className="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
            >
              Heslo {/* Label for password */}
            </label>
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)} // Toggle password visibility
              className="absolute right-0 top-0 mt-2 mr-2 text-gray-500"
            >
              <FontAwesomeIcon icon={showPwd ? faEyeSlash : faEye} /> {/* Eye icon */}
            </button>
          </div>

          {/* Submit button */}
          <button
            className={
              "text-white font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 mt-3 bg-blue-600 hover:bg-blue-700"
            }
          >
            Prihlásiť sa {/* Login button */}
          </button>
        </form>

        {/* Link to registration page */}
        <p className="text-gray-700 mt-4">
          Ešte nemáte účet?{" "}
          <Link to="/register" className="text-blue-600 hover:underline">
            Zaregistrujte sa {/* Registration link */}
          </Link>
        </p>
      </div>
    </section>
  );
};

export default Login;
