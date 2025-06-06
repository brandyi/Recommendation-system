import axios from "../api/axios";
import useAuth from "./useAuth";

// Custom hook to refresh the access token
const useRefreshToken = () => {
  const { setAuth } = useAuth(); // Access the authentication context to update auth state

  const refresh = async () => {
    // Send a request to the server to refresh the access token
    const response = await axios.get("/refresh", {
      withCredentials: true, // Include credentials for cross-origin requests
    });

    // Update the authentication state with the new access token
    setAuth((prev) => {
      return {
        ...prev, // Preserve existing authentication state
        accessToken: response.data.token, // Update the access token
      };
    });

    return response.data.token; // Return the new access token
  };

  return refresh; // Return the refresh function for use in components
};

export default useRefreshToken;
