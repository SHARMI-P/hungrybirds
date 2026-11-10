import axios from 'axios';
import { io } from 'socket.io-client';

export const API_URL = import.meta.env.VITE_API_URL || import.meta.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const TOKEN_KEY = 'admin_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY) || '';
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

const api = axios.create({ baseURL: API_URL, timeout: 20000 });

api.interceptors.request.use((c) => {
  const token = getToken();
  if (token) c.headers.Authorization = `Bearer ${token}`;
  return c;
});

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const status = err.response?.status;
    if ((status === 401 || status === 403) && getToken() && !err.config.url.includes('/auth/login')) onUnauthorized();
    return Promise.reject(err);
  },
);

export const errorMessage = (err, fallback = 'Something went wrong') => {
  const d = err?.response?.data;
  if (d?.errors?.length) return d.errors.map((e) => `${e.field ? `${e.field}: ` : ''}${e.message}`).join(' · ');
  return d?.message || (err?.message === 'Network Error' ? 'Cannot reach the API (it may be waking up)' : fallback);
};

export const createSocket = () =>
  io(API_URL.replace(/\/api\/?$/, ''), { auth: { token: getToken() }, transports: ['websocket', 'polling'] });

export default api;
