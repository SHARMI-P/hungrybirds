import { createContext, useContext, useState } from 'react';
import API from '../api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('hungrybirds_user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = async (email, password) => {
    try {
      const { data } = await API.post('/auth/login', { email, password });
      setUser(data);
      localStorage.setItem('hungrybirds_user', JSON.stringify(data));
      toast.success(`Welcome back, ${data.name}! 🐦`);
      return { success: true };
    } catch (error) {
      const msg = error.response?.data?.message || 'Login failed';
      toast.error(msg);
      return { success: false, message: msg };
    }
  };

  const register = async (name, email, phone, password) => {
    try {
      const { data } = await API.post('/auth/register', { name, email, phone, password });
      setUser(data);
      localStorage.setItem('hungrybirds_user', JSON.stringify(data));
      toast.success(`Account created! Welcome ${data.name} 🎉`);
      return { success: true };
    } catch (error) {
      const msg = error.response?.data?.message || 'Registration failed';
      toast.error(msg);
      return { success: false, message: msg };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('hungrybirds_user');
    toast.success('Logged out successfully');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
