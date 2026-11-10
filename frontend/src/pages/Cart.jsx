import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { EmptyState, VegMark } from '../components/ui';
import { FALLBACK_FOOD, rupees } from '../lib/format';

const Cart = () => {
  const { cart, addItem, removeItem, dropItem, clearCart, subtotal } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (cart.items.length === 0) {
    return (
      <div className="page-container">
        <EmptyState emoji="🛒" title="Your cart is empty">
          <p>Add items from a restaurant to get started</p>
          <button type="button" className="btn btn-primary" style={{ marginTop: 24 }} onClick={() => navigate('/')}>Browse Restaurants</button>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="page-container narrow">
      <div className="row between" style={{ marginBottom: 24 }}>
        <h1 className="section-title" style={{ margin: 0 }}>🛒 Your Cart</h1>
        <button type="button" className="btn btn-outline btn-sm" onClick={clearCart}>Clear Cart</button>
      </div>

      <Link to={`/restaurant/${cart.restaurantId}`} className="cart-restaurant">🏪 {cart.restaurantName} · add more items</Link>

      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        {cart.items.map((item) => (
          <div key={item._id} className="cart-item">
            <img src={item.image || FALLBACK_FOOD} alt="" onError={(e) => { e.currentTarget.src = FALLBACK_FOOD; }} />
            <div style={{ flex: 1 }}>
              <h4 className="row gap-8"><VegMark veg={item.isVeg} /> {item.name}</h4>
              <p className="muted small">{rupees(item.price)} each</p>
            </div>
            <div className="counter">
              <button type="button" className="counter-btn" onClick={() => removeItem(item._id)} aria-label={`Remove one ${item.name}`}>−</button>
              <span className="counter-num">{item.quantity}</span>
              <button type="button" className="counter-btn" onClick={() => addItem(item, cart.restaurantId, cart.restaurantName)} aria-label={`Add one ${item.name}`}>+</button>
            </div>
            <div className="line-total">{rupees(item.price * item.quantity)}</div>
            <button type="button" className="icon-btn" onClick={() => dropItem(item._id)} aria-label={`Remove ${item.name}`}>✕</button>
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="bill-row bold"><span>Item total</span><span>{rupees(subtotal)}</span></div>
        <p className="muted small" style={{ marginTop: 8 }}>
          Delivery fee (based on distance), coupons and GST are calculated at checkout.
        </p>
      </div>

      <button
        type="button"
        className="btn btn-primary btn-full btn-lg"
        onClick={() => navigate(user ? '/checkout' : '/login', { state: { from: '/checkout' } })}
      >
        {user ? 'Proceed to Checkout →' : 'Login to Checkout →'}
      </button>
    </div>
  );
};

export default Cart;
