import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../api';

const Orders = () => {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data } = await API.get('/orders/my');
      setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="loader"><div className="spinner"></div></div>
  );

  return (
    <div className="page-container" style={{ maxWidth: 700 }}>
      <h1 className="section-title">My Orders</h1>

      {orders.length === 0 ? (
        <div className="empty-state">
          <div className="emoji">📦</div>
          <h3>No orders yet</h3>
          <p>Your past orders will appear here</p>
          <Link to="/" className="btn btn-primary" style={{ marginTop: 24 }}>Order Food</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {orders.map(order => (
            <Link
              key={order._id}
              to={`/order/${order._id}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div style={{
                background: 'white', borderRadius: 16, padding: 20,
                boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                transition: 'box-shadow 0.2s',
              }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <img
                    src={order.restaurantId?.image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200'}
                    alt=""
                    style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 12 }}
                    onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200'; }}
                  />
                  <div>
                    <h4>{order.restaurantName}</h4>
                    <p style={{ color: 'var(--gray)', fontSize: '0.85rem', margin: '4px 0' }}>
                      {order.items?.length} items · ₹{order.finalAmount}
                    </p>
                    <p style={{ color: 'var(--gray)', fontSize: '0.8rem' }}>
                      {new Date(order.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className={`status-pill status-${order.orderStatus}`}>
                    {order.orderStatus.replace('_', ' ')}
                  </span>
                  <p style={{ color: 'var(--primary)', fontSize: '0.85rem', marginTop: 8, fontWeight: 600 }}>
                    Track Order →
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Orders;
