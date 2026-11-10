import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import API, { errorMessage } from '../api';
import { useCart } from '../context/CartContext';
import { EmptyState, Loader } from '../components/ui';
import { FALLBACK_RESTAURANT, formatDateTime, rupees, statusLabel } from '../lib/format';

const Orders = () => {
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
    toast.success('Items added to your cart');
    navigate('/cart');
  };

  if (loading) return <Loader />;

  return (
    <div className="page-container narrow">
      <h1 className="section-title">My Orders</h1>
      {orders.length === 0 ? (
        <EmptyState emoji="📦" title="No orders yet">
          <p>Your past orders will appear here</p>
          <Link to="/" className="btn btn-primary" style={{ marginTop: 24 }}>Order Food</Link>
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
                  <p className="muted small">{formatDateTime(order.createdAt)} · {rupees(order.finalAmount)}</p>
                </div>
              </Link>
              <div className="order-actions">
                <span className={`status-pill status-${order.orderStatus}`}>{statusLabel(order.orderStatus)}</span>
                {['delivered', 'cancelled'].includes(order.orderStatus) ? (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => reorder(order)}>↻ Reorder</button>
                ) : (
                  <Link to={`/order/${order._id}`} className="link bold small">Track →</Link>
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
