import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
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

