import { useRef, useState, useEffect} from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faTimes, faInfoCircle } from '@fortawesome/free-solid-svg-icons';

const USER_REGEX = /^[a-zA-Z][a-zA-Z0-9-_]{3,23}$/;
const PASS_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%]).{8,24}$/;

const Register = () => {
  const userRef = useRef();
  const errRef = useRef();

  const [user, setUser] = useState('');
  const [validName, setValidName] = useState(false);
  const [userFocus, setUserFocus] = useState(false);
  
  const [pwd, setPwd] = useState('');
  const [validPwd, setValidPwd] = useState(false);
  const [pwdFocus, setPwdFocus] = useState(false);

  const [matchPwd, setMatchPwd] = useState('');
  const [validMatch, setValidMatch] = useState(false);
  const [matchFocus, setMatchFocus] = useState(false);

  const [errMsg, setErrMsg] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    userRef.current.focus();
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
    console.log(validMatch);
    console.log(matchPwd);
  }, [pwd, matchPwd]);

  useEffect(() => {
    setErrMsg('');
  }, [user, pwd, matchPwd]);

  return (
    <section className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center text-gray-700 mb-6">Register</h1>
        <form>
          <p ref={errRef} className={errMsg ? "text-red-500" : "hidden"} aria-live="assertive">{errMsg}</p>
          
          <div className="relative z-0 w-full mb-5 group">
            <input 
              type="text" 
              name="floating_username" 
              id="floating_username" 
              className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer" 
              placeholder=" " 
              required 
              ref={userRef} 
              autoComplete="off" 
              onChange={(e) => setUser(e.target.value)}
              onFocus={() => setUserFocus(true)} 
              onBlur={() => setUserFocus(false)} 
            />
            <label htmlFor="floating_username" className="peer-focus:font-medium absolute text-sm text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 peer-focus:text-blue-600 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">
              Username
            </label>
            <span className={validName ? "text-green-500 ml-2 absolute right-0 top-1/2 transform -translate-y-1/2" : "hidden"}>
              <FontAwesomeIcon icon={faCheck}/>
            </span>
            <span className={validName || !user ? "hidden" : "text-red-500 ml-2 absolute right-0 top-1/2 transform -translate-y-1/2"}>
              <FontAwesomeIcon icon={faTimes}/>
            </span>
            <p id="uidnote" className={userFocus && user && !validName ? "text-gray-500 text-sm mt-2" : "hidden"}>   
              <FontAwesomeIcon icon={faInfoCircle} className="mr-2" />
              4 to 24 characters.<br />
              Must begin with a letter.<br />
              Letters, numbers, underscores, hyphens allowed.
            </p>
          </div>

          <div className="relative z-0 w-full mb-5 group">
            <input 
              type="password" 
              name="floating_password" 
              id="floating_password" 
              className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer" 
              placeholder=" " 
              required 
              autoComplete="off" 
              onChange={(e) => setPwd(e.target.value)}
              onFocus={() => setPwdFocus(true)} 
              onBlur={() => setPwdFocus(false)} 
            />
            <label htmlFor="floating_password" className="peer-focus:font-medium absolute text-sm text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 peer-focus:text-blue-600 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">
              Password
            </label>
            <span className={validPwd ? "text-green-500 ml-2 absolute right-0 top-1/2 transform -translate-y-1/2" : "hidden"}>
              <FontAwesomeIcon icon={faCheck}/>
            </span>
            <span className={validPwd || !pwd ? "hidden" : "text-red-500 ml-2 absolute right-0 top-1/2 transform -translate-y-1/2"}>
              <FontAwesomeIcon icon={faTimes}/>
            </span>
            <p className={pwdFocus && !validPwd ? "text-gray-500 text-sm mt-2" : "hidden"}> 
              <FontAwesomeIcon icon={faInfoCircle} className="mr-2" />  
              8 to 24 characters.<br />
              Must include uppercase and lowercase letters, a number and a special character.<br />
              Allowed special characters: <span>!</span> <span>@</span> <span>#</span> <span>$</span> <span aria-label="percent">%</span>
            </p>
          </div>

          <div className="relative z-0 w-full mb-5 group">
            <input 
              type="password" 
              name="floating_repeat_password" 
              id="floating_repeat_password" 
              className="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer" 
              placeholder=" " 
              required 
              autoComplete="off" 
              onChange={(e) => setMatchPwd(e.target.value)}
              onFocus={() => setMatchFocus(true)} 
              onBlur={() => setMatchFocus(false)} 
            />
            <label htmlFor="floating_repeat_password" className="peer-focus:font-medium absolute text-sm text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 peer-focus:text-blue-600 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">
              Confirm Password
            </label>
            <span className={validMatch && matchPwd ? "text-green-500 ml-2 absolute right-0 top-1/2 transform -translate-y-1/2" : "hidden"}>
              <FontAwesomeIcon icon={faCheck}/>
            </span>
            <span className={validMatch || !matchPwd ? "hidden" : "text-red-500 ml-2 absolute right-0 top-1/2 transform -translate-y-1/2"}>
              <FontAwesomeIcon icon={faTimes}/>
            </span>
            <p className={matchFocus && !validMatch ? "text-gray-500 text-sm mt-2" : "hidden"}> 
              <FontAwesomeIcon icon={faInfoCircle} className="mr-2" />  
              Must match password above.
            </p>
          </div>

          <button 
            type="submit" 
            className={`text-white font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center ${!validName || !validPwd || !validMatch ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300'}`} 
            disabled={!validName || !validPwd || !validMatch}
          >
            Submit
          </button>
        </form>
      </div>
    </section>
  );
};

export default Register;  