import axios from 'axios';

// Use environment variable if available, otherwise use relative path
// In development, Vite proxy will handle /api -> http://localhost:3000
// In production, VITE_API_URL should be set to full backend URL
let apiBaseURL = import.meta.env.VITE_API_URL;

if (!apiBaseURL) {
  // Development: use relative path (Vite proxy will handle it)
  apiBaseURL = '/api';
} else if (apiBaseURL.startsWith('http')) {
  // Production: ensure it ends with /api
  if (!apiBaseURL.endsWith('/api')) {
    apiBaseURL = apiBaseURL.endsWith('/') ? `${apiBaseURL}api` : `${apiBaseURL}/api`;
  }
}

const api = axios.create({
  baseURL: apiBaseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const token = localStorage.getItem('auth-storage');
if (token) {
  try {
    const parsed = JSON.parse(token);
    if (parsed.state?.token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${parsed.state.token}`;
    }
  } catch {
    // Ignore parse errors
  }
}

export default api;

