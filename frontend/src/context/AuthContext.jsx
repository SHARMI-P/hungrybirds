import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import API, { STORAGE_KEY, errorMessage, getStoredUser, setUnauthorizedHandler } from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(getStoredUser);

  const save = useCallback((data) => {
    setUser(data);
    if (data) localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    else localStorage.removeItem(STORAGE_KEY);
  }, []);

  const logout = useCallback(
    (message = 'Logged out successfully') => {
      save(null);
      if (message) toast.success(message);
    },
    [save],
  );

  // If the token expires or the account is removed, sign out cleanly.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      save(null);
      toast.error('Your session expired. Please log in again.');
    });
  }, [save]);

  // Refresh profile (role, addresses) on load so stale localStorage can't lie.
  useEffect(() => {
    if (!getStoredUser()?.token) return;
    API.get('/auth/me')
      .then(({ data }) => save({ ...getStoredUser(), ...data }))
      .catch(() => {});
  }, [save]);

  const login = async (email, password) => {
    try {
      const { data } = await API.post('/auth/login', { email, password });
      save(data);
      toast.success(`Welcome back, ${data.name.split(' ')[0]}! 🐦`);
      return { success: true, user: data };
    } catch (error) {
      const message = errorMessage(error, 'Login failed');
      toast.error(message);
      return { success: false, message };
    }
  };

  const register = async (form) => {
    try {
      const { data } = await API.post('/auth/register', form);
      save(data);
      toast.success(`Account created! Welcome ${data.name.split(' ')[0]} 🎉`);
      return { success: true };
    } catch (error) {
      const fieldErrors = Object.fromEntries((error.response?.data?.errors || []).map((e) => [e.field, e.message]));
      const message = errorMessage(error, 'Registration failed');
      if (!Object.keys(fieldErrors).length) toast.error(message);
      return { success: false, message, fieldErrors };
    }
  };

  const setAddresses = (addresses) => save({ ...getStoredUser(), addresses });

  const value = useMemo(() => ({ user, login, register, logout, setAddresses }), [user, logout]); // eslint-disable-line react-hooks/exhaustive-deps
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
