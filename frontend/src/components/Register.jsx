import { useRef, useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faInfoCircle,
  faEye,
  faEyeSlash,
} from "@fortawesome/free-solid-svg-icons";
import axios from "../api/axios.js";
import { Link } from "react-router-dom";

const USER_REGEX = /^[a-zA-Z][a-zA-Z0-9-_]{3,23}$/;
const PASS_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%]).{8,24}$/;

const Register = () => {
  const userRef = useRef();
  const errRef = useRef();

  const [user, setUser] = useState("");
  const [validName, setValidName] = useState(false);
  const [userFocus, setUserFocus] = useState(false);

  const [pwd, setPwd] = useState("");
  const [validPwd, setValidPwd] = useState(false);
  const [pwdFocus, setPwdFocus] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const [matchPwd, setMatchPwd] = useState("");
  const [validMatch, setValidMatch] = useState(false);
  const [matchFocus, setMatchFocus] = useState(false);
  const [showMatchPwd, setShowMatchPwd] = useState(false);

  const [errMsg, setErrMsg] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (userRef.current) {
      userRef.current.focus();
    }
  }, []);

  useEffect(() => {
    const result = USER_REGEX.test(user);
    setValidName(result);
  }, [user]);

  useEffect(() => {
    const result = PASS_REGEX.test(pwd);
    setValidPwd(result);
    const match = pwd === matchPwd;
    setValidMatch(match);
  }, [pwd, matchPwd]);

  useEffect(() => {
    setErrMsg("");
  }, [user, pwd, matchPwd]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const v1 = USER_REGEX.test(user);
    const v2 = PASS_REGEX.test(pwd);
    if (!v1 || !v2) {
      setErrMsg("Invalid entry.");
      return;
    }

    try {
      const response = await axios.post(
        "/register",
        JSON.stringify({ user, pwd }),
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: true,
        }
      );
      setSuccess(true);
    } catch (err) {
      if (!err?.response) {
        setErrMsg("No server response.");
      } else if (err?.response?.status === 409) {
        setErrMsg("Username Taken.");
      } else {
        setErrMsg("Registration failed.");
      }
    }
  };

  return (
    <>
      {success ? (
        <section className="flex flex-col justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 text-center">
          <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full mx-auto">
            <h1 className="text-3xl font-bold text-blue-600 mb-4">
              You have successfully been registered with name {user}!
            </h1>
            <p>
              <Link to="/login" className="text-blue-600 hover:underline">
                Login
              </Link>
            </p>
          </div>
        </section>
      ) : (
        <section className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
            <div
              className={errMsg ? "border-2 border-red-500 p-4 mb-4" : "hidden"}
            >
              <p ref={errRef} className="text-red-500" aria-live="assertive">
                {errMsg}
              </p>
            </div>
            <h1 className="text-3xl font-bold text-blue-600 mb-6">Register</h1>
            <form onSubmit={handleSubmit}>
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
                  Username
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
                4 to 24 characters.
                <br />
                Must begin with a letter.
                <br />
                Letters, numbers, underscores, hyphens allowed.
              </p>

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
                  Password
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
                8 to 24 characters.
                <br />
                Must include uppercase and lowercase letters, a number and a
                special character.
                <br />
                Allowed special characters: <span>!</span> <span>@</span>{" "}
                <span>#</span> <span>$</span>{" "}
                <span aria-label="percent">%</span>
              </p>

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
                  Confirm Password
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
                Must match password above.
              </p>

              <button
                className={`text-white font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 mt-3 ${
                  !validName || !validPwd || !validMatch
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
                disabled={!validName || !validPwd || !validMatch}
              >
                Sign up
              </button>
            </form>
            <p className="text-gray-700 mt-4">
              Already registered?{" "}
              <Link to="/" className="text-blue-600 hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </section>
      )}
    </>
  );
};

export default Register;
