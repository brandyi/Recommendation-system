import axios from "../api/axios";
import useAuth from "./useAuth";

// Custom hook to handle user logout
const useLogout = () => {
    const { setAuth } = useAuth(); // Access the authentication context to update auth state

    const logout = async () => {
        setAuth({}); // Clear authentication state
        try {
            // Send a logout request to the server
            const response = await axios('/logout', {
                withCredentials: true // Include credentials for cross-origin requests
            });
        } catch (err) {
            console.error(err); // Log any errors during the logout process
        }
    };

    return logout; // Return the logout function for use in components
};

export default useLogout;