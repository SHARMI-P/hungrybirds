import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await register(form.name, form.email, form.phone, form.password);
    setLoading(false);
    if (result.success) navigate('/');
  };

  return (
    <div style={{
      minHeight: '80vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{
        background: 'white', borderRadius: 24, padding: '48px 40px',
        boxShadow: '0 8px 40px rgba(0,0,0,0.1)', width: '100%', maxWidth: 420,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: '3rem', marginBottom: 8 }}>🐦</div>
          <h1 style={{ fontFamily: 'Syne', fontSize: '2rem', color: 'var(--primary)' }}>
            Join HungryBirds
          </h1>
          <p style={{ color: 'var(--gray)', marginTop: 8 }}>Create your account in seconds</p>
        </div>

        <form onSubmit={handleSubmit}>
          {[
            { name: 'name',     label: 'Full Name',        type: 'text',     placeholder: 'Your full name' },
            { name: 'email',    label: 'Email Address',    type: 'email',    placeholder: 'you@example.com' },
            { name: 'phone',    label: 'Phone Number',     type: 'tel',      placeholder: '9876543210' },
            { name: 'password', label: 'Password',         type: 'password', placeholder: 'Min 6 characters' },
          ].map(field => (
            <div key={field.name} className="input-group">
              <label>{field.label}</label>
              <input
                type={field.type}
                name={field.name}
                value={form[field.name]}
                onChange={handleChange}
                placeholder={field.placeholder}
                required
              />
            </div>
          ))}
          <button
            type="submit" className="btn btn-primary btn-full"
            style={{ padding: 16, marginTop: 8 }}
            disabled={loading}
          >
            {loading ? '⏳ Creating account...' : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, color: 'var(--gray)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 700 }}>Sign In</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
