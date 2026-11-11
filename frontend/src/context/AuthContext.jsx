import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import API, { STORAGE_KEY, errorMessage, getStoredUser, setUnauthorizedHandler } from '../api';
import { useT } from '../i18n';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const { t } = useT();
  const [user, setUser] = useState(getStoredUser);

  const save = useCallback((data) => {
    setUser(data);
    if (data) localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    else localStorage.removeItem(STORAGE_KEY);
  }, []);

  const patch = useCallback((fields) => save({ ...getStoredUser(), ...fields }), [save]);

  const logout = useCallback(
    (message = t('auth.loggedOut')) => {
      save(null);
      if (message) toast.success(message);
    },
    [save, t],
  );

  // If the token expires or the account is removed, sign out cleanly.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      save(null);
      toast.error(t('auth.sessionExpired'));
    });
  }, [save, t]);

  // Refresh profile (role, addresses, favourites) on load so stale localStorage can't lie.
  useEffect(() => {
    if (!getStoredUser()?.token) return;
    API.get('/auth/me')
      .then(({ data }) => patch(data))
      .catch(() => {});
  }, [patch]);

  const welcome = (data) => toast.success(t('auth.welcome', { name: data.name.split(' ')[0] }));

  // Used by email login and the phone-OTP flow.
  const startSession = (data) => {
    save(data);
    welcome(data);
    return data;
  };

  const login = async (email, password) => {
    try {
      const { data } = await API.post('/auth/login', { email, password });
      return { success: true, user: startSession(data) };
    } catch (error) {
      const message = errorMessage(error, t('auth.loginFailed'));
      toast.error(message);
      return { success: false, message };
    }
  };

  const register = async (form) => {
    try {
      const { data } = await API.post('/auth/register', form);
      startSession(data);
      return { success: true };
    } catch (error) {
      const fieldErrors = Object.fromEntries((error.response?.data?.errors || []).map((e) => [e.field, e.message]));
      const message = errorMessage(error, t('auth.registerFailed'));
      if (!Object.keys(fieldErrors).length) toast.error(message);
      return { success: false, message, fieldErrors };
    }
  };

  const setAddresses = (addresses) => patch({ addresses });

  const isFavorite = (restaurantId) => Boolean(user?.favorites?.some((id) => String(id) === String(restaurantId)));

  const toggleFavorite = async (restaurantId) => {
    if (!user) {
      toast(t('fav.loginFirst'), { icon: '❤️' });
      return;
    }
    const fav = isFavorite(restaurantId);
    try {
      const { data } = fav ? await API.delete(`/auth/favorites/${restaurantId}`) : await API.post(`/auth/favorites/${restaurantId}`);
      patch({ favorites: data });
      toast.success(fav ? t('fav.removed') : t('fav.added'), { id: 'fav' });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const value = useMemo(
    () => ({ user, login, register, logout, setAddresses, startSession, isFavorite, toggleFavorite }),
    [user, logout, t], // eslint-disable-line react-hooks/exhaustive-deps
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
