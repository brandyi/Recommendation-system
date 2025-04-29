import { useEffect, useRef, useState, useContext } from "react";
import axios from "../api/axios.js";
import AuthContext from "../context/authProvider.jsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import { Link, useNavigate, useLocation, replace } from "react-router-dom";

const Login = () => {
  const { setAuth } = useContext(AuthContext);

  const userRef = useRef();
  const errRef = useRef();

  const navigate = useNavigate();
  const location = useLocation();
  const from = location?.state?.from.pathname || "/survey/questions/";


  const [user, setUser] = useState("");
  const [pwd, setPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    userRef.current.focus();
  }, []);

  useEffect(() => {
    setErrMsg("");
  }, [user, pwd]);


  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post(
        "/auth",
        JSON.stringify({ user, pwd }),
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: true,
        }
      );
      const accessToken = response?.data?.accessToken;
      setAuth({ user, pwd, accessToken });
      setUser("");
      setPwd("");
      navigate(from, {replace: true});
    } catch (err) {
      if (!err?.response) {
        setErrMsg("No server response.");
      } else if (err?.response?.status === 400) {
        setErrMsg("Missing username or password.");
      } else if (err?.response?.status === 400) {
        setErrMsg("Unathorized.");
      } else {
        setErrMsg("Login failed.");
      }
    }
  };

  return (
    <section className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        <div className={errMsg ? "border-2 border-red-500 p-4 mb-4" : "hidden"}>
          <p ref={errRef} className="text-red-500" aria-live="assertive">
            {errMsg}
          </p>
        </div>
        <h1 className="text-3xl font-bold text-blue-600 mb-6">Prihlásenie</h1>
        <form onSubmit={handleSubmit}>
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
              ref={userRef}
              autoComplete="off"
              onChange={(e) => setUser(e.target.value)}
            />
            <label
              htmlFor="floating_username"
              className="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
            >
              Meno
            </label>
          </div>
          <div
            className={
              "relative z-0 w-full mb-3 group border-b-2 border-gray-300"
            }
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
          <button
            className={
              "text-white font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 mt-3 bg-blue-600 hover:bg-blue-700"
            }
          >
            Prihlásiť sa
          </button>
        </form>
        <p className="text-gray-700 mt-4">
          Ešte nemáte účet?{" "}
          <Link to="/register" className="text-blue-600 hover:underline">
            Zaregistrujte sa
          </Link>
        </p>
      </div>
    </section>
  );
};

export default Login;
