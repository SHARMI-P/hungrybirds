import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import API, { errorMessage } from '../api';
import { useAuth } from '../context/AuthContext';
import { useT } from '../i18n';

const PhoneLogin = ({ onDone }) => {
  const { t } = useT();
  const { startSession } = useAuth();
  const [step, setStep] = useState('phone'); // phone → code → name
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [demoCode, setDemoCode] = useState('');
  const [signupToken, setSignupToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!cooldown) return undefined;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const run = async (fn) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const send = () =>
    run(async () => {
      const { data } = await API.post('/auth/otp/send', { phone });
      setDemoCode(data.demoCode || '');
      setStep('code');
      setCooldown(30);
      toast.success(t('otp.sent'));
    });

  const verify = () =>
    run(async () => {
      const { data } = await API.post('/auth/otp/verify', { phone, code });
      if (data.needsName) {
        setSignupToken(data.signupToken);
        setStep('name');
        return;
      }
      onDone(startSession(data));
    });

  const complete = () =>
    run(async () => {
      const { data } = await API.post('/auth/otp/complete', { signupToken, name });
      onDone(startSession(data));
    });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (step === 'phone') send();
        else if (step === 'code') verify();
        else complete();
      }}
    >
      {step === 'phone' && (
        <div className="input-group">
          <label htmlFor="phone">{t('otp.phone')}</label>
          <div className="phone-input">
            <span>+91</span>
            <input id="phone" type="tel" inputMode="numeric" autoComplete="tel-national" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d\s]/g, ''))} placeholder="98450 12345" maxLength={12} required />
          </div>
        </div>
      )}

      {step === 'code' && (
        <>
          <p className="muted small" style={{ marginBottom: 12 }}>
            {t('otp.sentTo', { phone: `+91 ${phone}` })}{' '}
            <button type="button" className="link" onClick={() => { setStep('phone'); setCode(''); }}>{t('otp.change')}</button>
          </p>
          {demoCode && (
            <div className="alert alert-warn small">
              🧪 {t('otp.demo')} <b className="mono">{demoCode}</b>
            </div>
          )}
          <div className="input-group">
            <label htmlFor="code">{t('otp.code')}</label>
            <input id="code" className="otp-input" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="••••••" required autoFocus />
          </div>
          <button type="button" className="link small" disabled={cooldown > 0 || busy} onClick={send} style={{ marginBottom: 14 }}>
            {cooldown > 0 ? t('otp.resendIn', { s: cooldown }) : t('otp.resend')}
          </button>
        </>
      )}

      {step === 'name' && (
        <div className="input-group">
          <label htmlFor="otpName">{t('otp.yourName')}</label>
          <input id="otpName" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} autoFocus />
          <p className="muted small" style={{ marginTop: 6 }}>{t('otp.newAccount')}</p>
        </div>
      )}

      <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={busy}>
        {busy ? '⏳' : step === 'phone' ? t('otp.send') : step === 'code' ? t('otp.verify') : t('otp.create')}
      </button>
    </form>
  );
};

const Login = () => {
  const { t } = useT();
  const [mode, setMode] = useState('email');
  const [otpEnabled, setOtpEnabled] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    API.get('/auth/otp/config').then(({ data }) => setOtpEnabled(data.enabled)).catch(() => {});
  }, []);

  const goNext = (user) => {
    if (user.role === 'agent') navigate('/rider', { replace: true });
    else navigate(location.state?.from || '/', { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) goNext(result.user);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-head">
          <div className="auth-logo">🐦</div>
          <h1>HungryBirds</h1>
          <p className="muted">{t('login.subtitle')}</p>
        </div>

        {otpEnabled && (
          <div className="segmented-lg" role="tablist" style={{ marginBottom: 20 }}>
            <button type="button" role="tab" aria-selected={mode === 'email'} className={mode === 'email' ? 'active' : ''} onClick={() => setMode('email')}>✉️ {t('login.email')}</button>
            <button type="button" role="tab" aria-selected={mode === 'phone'} className={mode === 'phone' ? 'active' : ''} onClick={() => setMode('phone')}>📱 {t('login.phone')}</button>
          </div>
        )}

        {mode === 'phone' ? (
          <PhoneLogin onDone={goNext} />
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="email">{t('login.emailLabel')}</label>
              <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
            <div className="input-group">
              <label htmlFor="password">{t('login.password')}</label>
              <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
              {loading ? `⏳ ${t('login.signingIn')}` : t('login.signIn')}
            </button>
          </form>
        )}

        <p className="auth-foot">
          {t('login.new')} <Link to="/register" state={location.state}>{t('login.create')}</Link>
        </p>
        <p className="muted small center">{t('login.riderHint')}</p>
      </div>
    </div>
  );
};

export default Login;
