import { useContext } from "react";
import AuthContext from "../context/authProvider";

// Custom hook to access authentication context
const useAuth = () => {
    // Returns the current authentication context value
    return useContext(AuthContext);
}

export default useAuth;