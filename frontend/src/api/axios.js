import axios from 'axios';

// Base URL for the API. Change this value if the backend server URL changes.
const baseURL = 'http://localhost:8080/'; // Default is localhost:8080

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