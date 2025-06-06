import axios from 'axios';

// Base URL for the API. Change this value in the environment variables if needed.
const baseURL = process.env.VITE_BACKEND_URL; // Default is localhost:8080

// Create a default axios instance for public requests
export default axios.create({
  baseURL: baseURL, // Use the base URL for all requests
});

// Create a private axios instance for authenticated requests
export const axiosPrivate = axios.create({
  baseURL: baseURL, // Use the base URL for all requests
  headers: {'Content-Type': 'application/json'}, // Set default headers
  withCredentials: true, // Include credentials for cross-origin requests
});