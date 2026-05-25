// Single axios instance for the whole app.
// - Base URL comes from VITE_API_URL (or '/api' via the Vite dev proxy).
// - Request interceptor attaches the Bearer token if present.
// - Response interceptor: a 401 anywhere logs the user out automatically
//   (the AuthProvider listens for the custom event below).

import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL,
  timeout: 15_000,
});

// Auth state (token) is read from localStorage on each request so the latest
// value is always used — no need to reconstruct the client when the token
// changes after login.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('mer.token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Custom event the AuthProvider subscribes to — keeps this file framework-free.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new CustomEvent('mer:unauthorized'));
    }
    return Promise.reject(error);
  }
);
