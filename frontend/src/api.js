import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || import.meta.env.REACT_APP_API_URL || 'http://localhost:5000/api';
export const SOCKET_URL = API_URL.replace(/\/api\/?$/, '');

export const STORAGE_KEY = 'hungrybirds_user';

export const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
};

const API = axios.create({ baseURL: API_URL, timeout: 20000 });

API.interceptors.request.use((config) => {
  const user = getStoredUser();
  if (user?.token) config.headers.Authorization = `Bearer ${user.token}`;
  return config;
});

// Expired / revoked token → log out everywhere instead of showing broken pages.
let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

API.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && getStoredUser()?.token) onUnauthorized();
    return Promise.reject(error);
  },
);

// Human-readable message from any API error (including Zod field errors).
export const errorMessage = (error, fallback = 'Something went wrong') => {
  const data = error?.response?.data;
  if (data?.errors?.length) return data.errors.map((e) => e.message).join(' · ');
  if (data?.message) return data.message;
  if (error?.code === 'ECONNABORTED' || error?.message === 'Network Error') {
    return 'Cannot reach the server. It may be waking up — try again in a few seconds.';
  }
  return fallback;
};

export default API;
