import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo">
        🐦 Hungry<span>Birds</span>
      </Link>

      <div className="navbar-links">
        {user ? (
          <>
            <span style={{ color: '#1A1A1A', fontWeight: 600 }}>Hi, {user.name.split(' ')[0]}!</span>
            <Link to="/orders">My Orders</Link>
            <Link to="/cart" style={{ position: 'relative' }}>
              🛒 Cart
              {totalItems > 0 && (
                <span style={{
                  position: 'absolute', top: -8, right: -8,
                  background: 'var(--primary)', color: 'white',
                  borderRadius: '50%', width: 18, height: 18,
                  fontSize: '0.7rem', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {totalItems}
                </span>
              )}
            </Link>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => { logout(); navigate('/'); }}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register" className="btn btn-primary btn-sm">Sign Up</Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
