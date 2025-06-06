import { axiosPrivate } from "../api/axios";
import { useEffect } from "react";
import useRefreshToken from "./useRefreshToken";
import useAuth from "./useAuth";

// Custom hook to configure axios instance with private requests
const useAxiosPrivate = () => {
  const refresh = useRefreshToken(); // Hook to refresh access tokens
  const { auth } = useAuth(); // Access authentication context

  useEffect(() => {
    // Intercept outgoing requests to add Authorization header
    const requestIntercept = axiosPrivate.interceptors.request.use(
      config => {
        if (!config.headers.Authorization) {
          config.headers.Authorization = `Bearer ${auth?.accessToken}`; // Add access token to headers
        }
        return config;
      }, 
      error => Promise.reject(error) // Handle request errors
    );

    // Intercept incoming responses to handle token expiration
    const responseIntercept = axiosPrivate.interceptors.response.use(
      (response) => response, // Pass successful responses through
      async (error) => {
        const prevRequest = error?.config; // Access the failed request
        if (error?.response?.status === 403 && !prevRequest?.sent) { // Handle 403 errors (token expiration)
          prevRequest.sent = true; // Mark request as sent to avoid infinite loops
          const newAccessToken = await refresh(); // Refresh the access token
          prevRequest.headers.Authorization = `Bearer ${newAccessToken}`; // Update Authorization header
          return axiosPrivate(prevRequest); // Retry the request with the new token
        }
        return Promise.reject(error); // Reject other errors
      }
    );

    // Cleanup interceptors when the component unmounts
    return () => {
      axiosPrivate.interceptors.request.eject(requestIntercept); // Remove request interceptor
      axiosPrivate.interceptors.response.eject(responseIntercept); // Remove response interceptor
    };
  }, [auth, refresh]); // Re-run effect when auth or refresh changes

  return axiosPrivate; // Return the configured axios instance
};

export default useAxiosPrivate;
