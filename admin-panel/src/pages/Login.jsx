import { useState } from 'react';
import api, { errorMessage, setToken } from '../api';

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      if (data.role !== 'admin') {
        setError('This account is not an admin');
        return;
      }
      setToken(data.token);
      onLogin(data);
    } catch (err) {
      setError(errorMessage(err, 'Invalid credentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="center-screen">
      <form className="login-card" onSubmit={handleLogin}>
        <h1 className="brand big">🐦 HungryBirds</h1>
        <p className="muted center" style={{ marginBottom: 28 }}>Admin Panel</p>
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        <label className="field">
          <span>Email</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="username" required />
        </label>
        <label className="field">
          <span>Password</span>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password" required />
        </label>
        <button type="submit" className="btn btn-primary btn-full" disabled={loading}>{loading ? 'Signing in…' : 'Sign In'}</button>
      </form>
    </div>
  );
};

export default Login;
