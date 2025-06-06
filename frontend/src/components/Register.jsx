import { useRef, useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faInfoCircle,
  faEye,
  faEyeSlash,
} from "@fortawesome/free-solid-svg-icons";
import axios from "../api/axios.js";
import { Link } from "react-router-dom";

// Regular expressions for validating username and password
const USER_REGEX = /^[a-zA-Z][a-zA-Z0-9-_]{3,23}$/;
const PASS_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%]).{8,24}$/;

// Registration component for creating a new user account
const Register = () => {
  const userRef = useRef(); // Reference for username input
  const errRef = useRef(); // Reference for error message

  const [user, setUser] = useState(""); // Username state
  const [validName, setValidName] = useState(false); // Username validation state
  const [userFocus, setUserFocus] = useState(false); // Focus state for username input

  const [pwd, setPwd] = useState(""); // Password state
  const [validPwd, setValidPwd] = useState(false); // Password validation state
  const [pwdFocus, setPwdFocus] = useState(false); // Focus state for password input
  const [showPwd, setShowPwd] = useState(false); // Toggle password visibility

  const [matchPwd, setMatchPwd] = useState(""); // Confirm password state
  const [validMatch, setValidMatch] = useState(false); // Confirm password validation state
  const [matchFocus, setMatchFocus] = useState(false); // Focus state for confirm password input
  const [showMatchPwd, setShowMatchPwd] = useState(false); // Toggle confirm password visibility

  const [errMsg, setErrMsg] = useState(""); // Error message state
  const [success, setSuccess] = useState(false); // Success state for registration

  useEffect(() => {
    if (userRef.current) {
      userRef.current.focus(); // Focus on username input on component mount
    }
  }, []);

  useEffect(() => {
    const result = USER_REGEX.test(user); // Validate username
    setValidName(result);
  }, [user]);

  useEffect(() => {
    const result = PASS_REGEX.test(pwd); // Validate password
    setValidPwd(result);
    const match = pwd === matchPwd; // Check if passwords match
    setValidMatch(match);
  }, [pwd, matchPwd]);

  useEffect(() => {
    setErrMsg(""); // Clear error message when inputs change
  }, [user, pwd, matchPwd]);

  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent default form submission

    const v1 = USER_REGEX.test(user); // Validate username
    const v2 = PASS_REGEX.test(pwd); // Validate password
    if (!v1 || !v2) {
      setErrMsg("Invalid entry."); // Show error if validation fails
      return;
    }

    try {
      const response = await axios.post(
        "/register",
        JSON.stringify({ user, pwd }), // Send registration data
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: true,
        }
      );
      setSuccess(true); // Set success state on successful registration
    } catch (err) {
      if (!err?.response) {
        setErrMsg("No server response."); // Handle server errors
      } else if (err?.response?.status === 409) {
        setErrMsg("Username Taken."); // Handle username conflict
      } else {
        setErrMsg("Registration failed."); // Handle other errors
      }
    }
  };

  return (
    <>
      {success ? (
        <section className="flex flex-col justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 text-center">
          {/* Success message */}
          <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full mx-auto">
            <h1 className="text-3xl font-bold text-blue-600 mb-6">
              Boli ste úspešne zaregistrovaný {user}!
            </h1>
            <Link
              to="/login"
              className="bg-blue-500 border-1 border-solid border-white hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              Prihlásiť sa
            </Link>
          </div>
        </section>
      ) : (
        <section className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
          {/* Registration form */}
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
            <div
              className={errMsg ? "border-2 border-red-500 p-4 mb-4" : "hidden"}
            >
              <p ref={errRef} className="text-red-500" aria-live="assertive">
                {errMsg}
              </p>
            </div>
            <h1 className="text-3xl font-bold text-blue-600 mb-6">
              Registrácia
            </h1>
            <form onSubmit={handleSubmit}>
              {/* Username input */}
              <div
                className={`relative z-0 w-full mb-3 group ${
                  validName
                    ? "border-b-2 border-green-500"
                    : user && !validName
                    ? "border-b-2 border-red-500"
                    : "border-b-2 border-gray-300"
                }`}
              >
                <input
                  type="text"
                  name="floating_username"
                  id="floating_username"
                  className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent focus:outline-none focus:ring-0 peer"
                  placeholder=" "
                  required
                  ref={userRef}
                  autoComplete="off"
                  onChange={(e) => setUser(e.target.value)}
                  onFocus={() => setUserFocus(true)}
                  onBlur={() => setUserFocus(false)}
                />
                <label
                  htmlFor="floating_username"
                  className="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
                >
                  Meno
                </label>
              </div>
              <p
                id="uidnote"
                className={
                  userFocus && user && !validName
                    ? "text-gray-500 text-sm mt-2"
                    : "hidden"
                }
              >
                <FontAwesomeIcon icon={faInfoCircle} className="mr-2" />
                4 až 24 znakov.
                <br />
                Musí sa začínať písmenom.
                <br />
                Písmená, čísla, podčiarkovníky, spojovníky povolené.
              </p>

              {/* Password input */}
              <div
                className={`relative z-0 w-full mb-3 group ${
                  validPwd
                    ? "border-b-2 border-green-500"
                    : pwd && !validPwd
                    ? "border-b-2 border-red-500"
                    : "border-b-2 border-gray-300"
                }`}
              >
                <input
                  type={showPwd ? "text" : "password"}
                  name="floating_password"
                  id="floating_password"
                  className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent focus:outline-none focus:ring-0 peer"
                  placeholder=" "
                  required
                  autoComplete="off"
                  onChange={(e) => setPwd(e.target.value)}
                  onFocus={() => setPwdFocus(true)}
                  onBlur={() => setPwdFocus(false)}
                />
                <label
                  htmlFor="floating_password"
                  className="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
                >
                  Heslo
                </label>
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-0 top-0 mt-2 mr-2 text-gray-500"
                >
                  <FontAwesomeIcon icon={showPwd ? faEyeSlash : faEye} />
                </button>
              </div>
              <p
                className={
                  pwdFocus && !validPwd
                    ? "text-gray-500 text-sm mt-2 mb-2"
                    : "hidden"
                }
              >
                <FontAwesomeIcon icon={faInfoCircle} className="mr-2" />
                8 až 24 znakov.
                <br />
                Musí obsahovať veľké a malé písmená, číslo a špeciálny znak.
                <br />
                Povolené špecíalne znaky: <span>!</span> <span>@</span>{" "}
                <span>#</span> <span>$</span>{" "}
                <span aria-label="percent">%</span>
              </p>

              {/* Confirm password input */}
              <div
                className={`relative z-0 w-full mb-3 group ${
                  validMatch && matchPwd
                    ? "border-b-2 border-green-500"
                    : matchPwd && !validMatch
                    ? "border-b-2 border-red-500"
                    : "border-b-2 border-gray-300"
                }`}
              >
                <input
                  type={showMatchPwd ? "text" : "password"}
                  name="floating_repeat_password"
                  id="floating_repeat_password"
                  className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent focus:outline-none focus:ring-0 peer"
                  placeholder=" "
                  required
                  autoComplete="off"
                  onChange={(e) => setMatchPwd(e.target.value)}
                  onFocus={() => setMatchFocus(true)}
                  onBlur={() => setMatchFocus(false)}
                />
                <label
                  htmlFor="floating_repeat_password"
                  className="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
                >
                  Potvrdenie hesla
                </label>
                <button
                  type="button"
                  onClick={() => setShowMatchPwd(!showMatchPwd)}
                  className="absolute right-0 top-0 mt-2 mr-2 text-gray-500"
                >
                  <FontAwesomeIcon icon={showMatchPwd ? faEyeSlash : faEye} />
                </button>
              </div>
              <p
                className={
                  matchFocus && !validMatch
                    ? "text-gray-500 text-sm mt-2"
                    : "hidden"
                }
              >
                <FontAwesomeIcon icon={faInfoCircle} className="mr-2" />
                Musí sa zhodovať s heslom vyššie.
              </p>

              {/* Submit button */}
              <button
                className={`text-white font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 mt-3 ${
                  !validName || !validPwd || !validMatch
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
                disabled={!validName || !validPwd || !validMatch}
              >
                Registrovať sa
              </button>
            </form>
            <p className="text-gray-700 mt-4">
              Už máte účet?{" "}
              <Link to="/login" className="text-blue-600 hover:underline">
                Prihlásiť sa
              </Link>
            </p>
          </div>
        </section>
      )}
    </>
  );
};

export default Register;
