import axios from 'axios';

const baseURL = import.meta.env.VITE_BACKEND_URL; // Default is localhost:8080

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