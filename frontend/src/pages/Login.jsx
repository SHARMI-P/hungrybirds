import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (!result.success) return;
    if (result.user.role === 'agent') navigate('/rider', { replace: true });
    else navigate(location.state?.from || '/', { replace: true });
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-head">
          <div className="auth-logo">🐦</div>
          <h1>HungryBirds</h1>
          <p className="muted">Welcome back! Sign in to continue</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="email">Email address</label>
            <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
          </div>
          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" required />
          </div>
          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
            {loading ? '⏳ Signing in…' : 'Sign In'}
          </button>
        </form>
        <p className="auth-foot">
          New to HungryBirds? <Link to="/register" state={location.state}>Create account</Link>
        </p>
        <p className="muted small center">Delivery partner? Log in with the account your admin created to open the rider app.</p>
      </div>
    </div>
  );
};

export default Login;
