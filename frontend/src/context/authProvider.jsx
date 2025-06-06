import { createContext, useState } from "react";

// Create a context for authentication
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState({}); // State to store authentication data

  return (
    // Provide authentication state and updater function to child components
    <AuthContext.Provider value={{ auth, setAuth }}>
      {children} {/* Render child components */}
    </AuthContext.Provider>
  );
};

export default AuthContext;