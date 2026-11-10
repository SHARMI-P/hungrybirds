import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const FIELDS = [
  { name: 'name', label: 'Full name', type: 'text', autoComplete: 'name', placeholder: 'Your name' },
  { name: 'email', label: 'Email address', type: 'email', autoComplete: 'email', placeholder: 'you@example.com' },
  { name: 'phone', label: 'Mobile number', type: 'tel', autoComplete: 'tel', placeholder: '10-digit mobile number', pattern: '[6-9][0-9]{9}' },
  { name: 'password', label: 'Password', type: 'password', autoComplete: 'new-password', placeholder: 'At least 8 characters', minLength: 8 },
];

const Register = () => {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await register(form);
    setLoading(false);
    if (result.success) navigate(location.state?.from || '/', { replace: true });
    else setErrors(result.fieldErrors || {});
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-head">
          <div className="auth-logo">🐦</div>
          <h1>Join HungryBirds</h1>
          <p className="muted">Hot food from Dharwad & Hubli, delivered</p>
        </div>
        <form onSubmit={handleSubmit} noValidate>
          {FIELDS.map(({ name, label, ...input }) => (
            <div className="input-group" key={name}>
              <label htmlFor={name}>{label}</label>
              <input
                id={name}
                name={name}
                value={form[name]}
                onChange={(e) => {
                  setForm({ ...form, [name]: e.target.value });
                  setErrors({ ...errors, [name]: undefined });
                }}
                aria-invalid={Boolean(errors[name])}
                aria-describedby={errors[name] ? `${name}-err` : undefined}
                required
                {...input}
              />
              {errors[name] && <div id={`${name}-err`} className="field-error">{errors[name]}</div>}
            </div>
          ))}
          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
            {loading ? '⏳ Creating account…' : 'Create Account'}
          </button>
        </form>
        <p className="auth-foot">
          Already have an account? <Link to="/login" state={location.state}>Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
