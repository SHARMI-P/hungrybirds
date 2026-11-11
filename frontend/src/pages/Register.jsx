import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useT } from '../i18n';

const FIELDS = [
  { name: 'name', type: 'text', autoComplete: 'name' },
  { name: 'email', type: 'email', autoComplete: 'email', placeholder: 'you@example.com' },
  { name: 'phone', type: 'tel', autoComplete: 'tel', pattern: '[6-9][0-9]{9}' },
  { name: 'password', type: 'password', autoComplete: 'new-password', minLength: 8 },
];

const Register = () => {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useT();

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
          <h1>{t('register.title')}</h1>
          <p className="muted">{t('register.subtitle')}</p>
        </div>
        <form onSubmit={handleSubmit} noValidate>
          {FIELDS.map(({ name, ...input }) => (
            <div className="input-group" key={name}>
              <label htmlFor={name}>{t(`register.${name}`)}</label>
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
                placeholder={input.placeholder || t(`register.${name}.ph`)}
                {...input}
              />
              {errors[name] && <div id={`${name}-err`} className="field-error">{errors[name]}</div>}
            </div>
          ))}
          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
            {loading ? `⏳ ${t('register.creating')}` : t('register.submit')}
          </button>
        </form>
        <p className="auth-foot">
          {t('register.have')} <Link to="/login" state={location.state}>{t('login.signIn')}</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
