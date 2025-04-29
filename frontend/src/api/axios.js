import axios from 'axios';
const baseURL = 'https://movie-rec-backend-722282028678.europe-central2.run.app';

export default axios.create({
  baseURL: baseURL,
});

export const axiosPrivate = axios.create({
  baseURL: baseURL,
  headers: {'Content-Type': 'application/json'},
  withCredentials: true,
});