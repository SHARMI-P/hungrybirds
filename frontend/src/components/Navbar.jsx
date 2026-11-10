import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const isRider = user?.role === 'agent';

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo" aria-label="HungryBirds home">
        🐦 Hungry<span>Birds</span>
      </Link>

      <div className="navbar-links">
        {user ? (
          <>
            <span className="nav-hello">Hi, {user.name.split(' ')[0]}!</span>
            {isRider ? (
              <NavLink to="/rider">🛵 Rider</NavLink>
            ) : (
              <>
                <NavLink to="/orders">My Orders</NavLink>
                <CartLink count={totalItems} />
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
              Logout
            </button>
          </>
        ) : (
          <>
            <CartLink count={totalItems} />
            <NavLink to="/login">Login</NavLink>
            <Link to="/register" className="btn btn-primary btn-sm">Sign Up</Link>
          </>
        )}
      </div>
    </nav>
  );
};

const CartLink = ({ count }) => (
  <NavLink to="/cart" className="cart-link" aria-label={`Cart, ${count} items`}>
    🛒 <span className="hide-sm">Cart</span>
    {count > 0 && <span className="badge">{count}</span>}
  </NavLink>
);

export default Navbar;
