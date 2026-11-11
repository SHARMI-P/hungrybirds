import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { EmptyState, VegMark } from '../components/ui';
import { FALLBACK_FOOD, rupees } from '../lib/format';
import { useT } from '../i18n';

const Cart = () => {
  const { cart, addItem, removeItem, dropItem, clearCart, subtotal } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useT();

  if (cart.items.length === 0) {
    return (
      <div className="page-container">
        <EmptyState emoji="🛒" title={t('cart.empty')}>
          <p>{t('cart.emptyHint')}</p>
          <button type="button" className="btn btn-primary" style={{ marginTop: 24 }} onClick={() => navigate('/')}>{t('cart.browse')}</button>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="page-container narrow">
      <div className="row between" style={{ marginBottom: 24 }}>
        <h1 className="section-title" style={{ margin: 0 }}>🛒 {t('cart.title')}</h1>
        <button type="button" className="btn btn-outline btn-sm" onClick={clearCart}>{t('cart.clear')}</button>
      </div>

      <Link to={`/restaurant/${cart.restaurantId}`} className="cart-restaurant">🏪 {cart.restaurantName} · {t('cart.addMore')}</Link>

      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        {cart.items.map((item) => (
          <div key={item._id} className="cart-item">
            <img src={item.image || FALLBACK_FOOD} alt="" onError={(e) => { e.currentTarget.src = FALLBACK_FOOD; }} />
            <div style={{ flex: 1 }}>
              <h4 className="row gap-8"><VegMark veg={item.isVeg} /> {item.name}</h4>
              <p className="muted small">{t('cart.each', { price: rupees(item.price) })}</p>
            </div>
            <div className="counter">
              <button type="button" className="counter-btn" onClick={() => removeItem(item._id)} aria-label={t('cart.removeOne', { name: item.name })}>−</button>
              <span className="counter-num">{item.quantity}</span>
              <button type="button" className="counter-btn" onClick={() => addItem(item, cart.restaurantId, cart.restaurantName)} aria-label={t('cart.addOne', { name: item.name })}>+</button>
            </div>
            <div className="line-total">{rupees(item.price * item.quantity)}</div>
            <button type="button" className="icon-btn" onClick={() => dropItem(item._id)} aria-label={t('cart.remove', { name: item.name })}>✕</button>
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="bill-row bold"><span>{t('bill.itemTotal')}</span><span>{rupees(subtotal)}</span></div>
        <p className="muted small" style={{ marginTop: 8 }}>
          {t('cart.feesNote')}
        </p>
      </div>

      <button
        type="button"
        className="btn btn-primary btn-full btn-lg"
        onClick={() => navigate(user ? '/checkout' : '/login', { state: { from: '/checkout' } })}
      >
        {user ? t('cart.checkout') : t('cart.loginToCheckout')}
      </button>
    </div>
  );
};

export default Cart;
