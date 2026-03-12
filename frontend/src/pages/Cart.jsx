import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const Cart = () => {
  const { cart, addItem, removeItem, clearCart, subtotal } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const DELIVERY_FEE = 30;
  const GST = Math.round(subtotal * 0.05);
  const total = subtotal + DELIVERY_FEE + GST;

  if (cart.items.length === 0) {
    return (
      <div className="page-container">
        <div className="empty-state" style={{ marginTop: 60 }}>
          <div className="emoji">🛒</div>
          <h3>Your cart is empty</h3>
          <p>Add items from a restaurant to get started</p>
          <button className="btn btn-primary" style={{ marginTop: 24 }} onClick={() => navigate('/')}>
            Browse Restaurants
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: 800 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="section-title" style={{ margin: 0 }}>🛒 Your Cart</h1>
        <button className="btn btn-outline btn-sm" onClick={clearCart}>Clear Cart</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
        {/* Restaurant name */}
        <div style={{
          background: '#FFF3EE', padding: '12px 20px',
          borderRadius: 12, fontWeight: 600, color: 'var(--primary)',
        }}>
          🏪 {cart.restaurantName}
        </div>

        {/* Items */}
        <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          {cart.items.map(item => (
            <div key={item._id} className="cart-item">
              <img
                src={item.image || 'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=200'}
                alt={item.name}
                onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=200'; }}
              />
              <div style={{ flex: 1 }}>
                <h4 style={{ marginBottom: 4 }}>{item.name}</h4>
                <p style={{ color: 'var(--gray)', fontSize: '0.85rem' }}>₹{item.price} each</p>
              </div>
              <div className="counter">
                <button className="counter-btn" onClick={() => removeItem(item._id)}>−</button>
                <span className="counter-num">{item.quantity}</span>
                <button
                  className="counter-btn"
                  onClick={() => addItem(item, cart.restaurantId, cart.restaurantName)}
                >+</button>
              </div>
              <div style={{ fontWeight: 700, minWidth: 70, textAlign: 'right' }}>
                ₹{item.price * item.quantity}
              </div>
            </div>
          ))}
        </div>

        {/* Bill Summary */}
        <div style={{
          background: 'white', borderRadius: 16, padding: 24,
          boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
        }}>
          <h3 style={{ fontFamily: 'Syne', marginBottom: 20 }}>Bill Details</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--gray)' }}>
              <span>Item Total</span>
              <span>₹{subtotal}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--gray)' }}>
              <span>Delivery Fee</span>
              <span>₹{DELIVERY_FEE}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--gray)' }}>
              <span>GST (5%)</span>
              <span>₹{GST}</span>
            </div>
            <div style={{
              borderTop: '2px solid #F3F4F6', paddingTop: 12,
              display: 'flex', justifyContent: 'space-between',
              fontWeight: 700, fontSize: '1.1rem',
            }}>
              <span>Total Amount</span>
              <span>₹{total}</span>
            </div>
          </div>
        </div>

        {/* Proceed Button */}
        <button
          className="btn btn-primary btn-full"
          style={{ padding: '18px', fontSize: '1rem' }}
          onClick={() => {
            if (!user) {
              navigate('/login');
              return;
            }
            navigate('/payment', { state: { total, subtotal, deliveryFee: DELIVERY_FEE, gst: GST } });
          }}
        >
          Proceed to Payment → ₹{total}
        </button>
      </div>
    </div>
  );
};

export default Cart;
