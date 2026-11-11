import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { LANGUAGES, useT } from '../i18n';

const LanguageSwitch = () => {
  const { lang, setLang, t } = useT();
  const next = LANGUAGES.find((l) => l.code !== lang);
  return (
    <button type="button" className="lang-btn" onClick={() => setLang(next.code)} aria-label={t('nav.switchLanguage', { lang: next.label })} title={next.label}>
      🌐 {next.label}
    </button>
  );
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const { totalItems } = useCart();
  const { t } = useT();
  const navigate = useNavigate();
  const isRider = user?.role === 'agent';

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo" aria-label="HungryBirds home">
        🐦 Hungry<span>Birds</span>
      </Link>

      <div className="navbar-links">
        <LanguageSwitch />
        {user ? (
          <>
            <span className="nav-hello">{t('nav.hi', { name: user.name.split(' ')[0] })}</span>
            {isRider ? (
              <NavLink to="/rider">🛵 {t('nav.rider')}</NavLink>
            ) : (
              <>
                <NavLink to="/orders">{t('nav.myOrders')}</NavLink>
                <CartLink count={totalItems} label={t('nav.cart')} />
              </>
            )}
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => {
                logout();
                navigate('/');
              }}
            >
              {t('nav.logout')}
            </button>
          </>
        ) : (
          <>
            <CartLink count={totalItems} label={t('nav.cart')} />
            <NavLink to="/login">{t('nav.login')}</NavLink>
            <Link to="/register" className="btn btn-primary btn-sm">{t('nav.signup')}</Link>
          </>
        )}
      </div>
    </nav>
  );
};

const CartLink = ({ count, label }) => (
  <NavLink to="/cart" className="cart-link" aria-label={`${label}, ${count}`}>
    🛒 <span className="hide-sm">{label}</span>
    {count > 0 && <span className="badge">{count}</span>}
  </NavLink>
);

export default Navbar;
