import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import API, { errorMessage } from '../api';
import { useCart } from '../context/CartContext';
import { useT } from '../i18n';
import { EmptyState, Loader } from '../components/ui';
import { FALLBACK_RESTAURANT, formatDateTime, formatSlot, rupees, statusLabel } from '../lib/format';

const Orders = () => {
  const { t, locale } = useT();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { replaceCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    API.get('/orders/my')
      .then(({ data }) => setOrders(data))
      .catch((e) => toast.error(errorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  // Re-order: refill the cart with the same items (current prices apply at checkout).
  const reorder = (order) => {
    const restaurantId = order.restaurantId?._id || order.restaurantId;
    replaceCart(restaurantId, order.restaurantName, order.items.map((i) => ({ ...i, _id: i.menuItemId })));
    toast.success(t('orders.reordered'));
    navigate('/cart');
  };

  if (loading) return <Loader />;

  return (
    <div className="page-container narrow">
      <h1 className="section-title">{t('nav.myOrders')}</h1>
      {orders.length === 0 ? (
        <EmptyState emoji="📦" title={t('orders.none')}>
          <p>{t('orders.noneHint')}</p>
          <Link to="/" className="btn btn-primary" style={{ marginTop: 24 }}>{t('orders.orderFood')}</Link>
        </EmptyState>
      ) : (
        <div className="stack gap-16">
          {orders.map((order) => (
            <div key={order._id} className="panel order-row">
              <Link to={`/order/${order._id}`} className="row gap-16 order-link">
                <img src={order.restaurantId?.image || FALLBACK_RESTAURANT} alt="" onError={(e) => { e.currentTarget.src = FALLBACK_RESTAURANT; }} />
                <div>
                  <h4>{order.restaurantName}</h4>
                  <p className="muted small">{order.items.map((i) => `${i.name} × ${i.quantity}`).join(', ')}</p>
                  <p className="muted small">
                    {order.scheduledFor ? `🗓️ ${formatSlot(order.scheduledFor, locale)}` : formatDateTime(order.createdAt, locale)} · {rupees(order.finalAmount)}
                  </p>
                </div>
              </Link>
              <div className="order-actions">
                <span className={`status-pill status-${order.orderStatus}`}>{statusLabel(order.orderStatus, t)}</span>
                {['delivered', 'cancelled'].includes(order.orderStatus) ? (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => reorder(order)}>↻ {t('orders.reorder')}</button>
                ) : (
                  <Link to={`/order/${order._id}`} className="link bold small">{t('orders.track')} →</Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Orders;
