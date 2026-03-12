import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import API from '../api';

const STATUS_STEPS = [
  { key: 'placed',    label: 'Order Placed',       emoji: '📋', desc: 'We received your order!' },
  { key: 'confirmed', label: 'Order Confirmed',     emoji: '✅', desc: 'Restaurant accepted your order' },
  { key: 'preparing', label: 'Preparing Food',      emoji: '👨‍🍳', desc: 'Your food is being prepared' },
  { key: 'picked_up', label: 'Out for Delivery',    emoji: '🛵', desc: 'Delivery partner picked up your order' },
  { key: 'delivered', label: 'Delivered!',           emoji: '🎉', desc: 'Enjoy your meal!' },
];

const OrderTracking = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrder();

    // Connect to Socket.io for real-time updates
    const socket = io(process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000');
    socket.emit('join_order', id);
    socket.on('order_status_update', ({ status }) => {
      setOrder(prev => prev ? { ...prev, orderStatus: status } : prev);
    });

    return () => socket.disconnect();
  }, [id]);

  const fetchOrder = async () => {
    try {
      const { data } = await API.get(`/orders/${id}`);
      setOrder(data);
    } catch (err) {
      alert('Order not found');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="loader"><div className="spinner"></div></div>
  );

  if (!order) return (
    <div className="empty-state">
      <div className="emoji">😕</div>
      <h3>Order not found</h3>
    </div>
  );

  const currentStepIdx = STATUS_STEPS.findIndex(s => s.key === order.orderStatus);

  return (
    <div className="page-container" style={{ maxWidth: 700 }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #FF4500, #FF8C42)',
        borderRadius: 20, padding: '28px 32px', color: 'white', marginBottom: 24,
      }}>
        <h1 style={{ fontFamily: 'Syne', fontSize: '1.8rem', marginBottom: 8 }}>
          {STATUS_STEPS[currentStepIdx]?.emoji} {STATUS_STEPS[currentStepIdx]?.label}
        </h1>
        <p style={{ opacity: 0.9 }}>{STATUS_STEPS[currentStepIdx]?.desc}</p>
        <div style={{ marginTop: 16, opacity: 0.85, fontSize: '0.9rem' }}>
          Order ID: #{order._id?.slice(-8).toUpperCase()}
        </div>
      </div>

      {/* Tracking Steps */}
      <div style={{
        background: 'white', borderRadius: 16, padding: 24,
        boxShadow: '0 2px 12px rgba(0,0,0,0.07)', marginBottom: 24,
      }}>
        <h3 style={{ fontFamily: 'Syne', marginBottom: 20 }}>Live Tracking</h3>
        <div className="tracking-steps">
          {STATUS_STEPS.map((step, idx) => {
            const isDone   = idx < currentStepIdx;
            const isActive = idx === currentStepIdx;
            const isLast   = idx === STATUS_STEPS.length - 1;
            return (
              <div key={step.key} className={`step ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}`}>
                <div className="step-icon">{isDone ? '✓' : step.emoji}</div>
                <div>
                  <div style={{ fontWeight: 600 }}>{step.label}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--gray)' }}>{step.desc}</div>
                </div>
                {!isLast && <div className="step-line" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Delivery Agent */}
      {order.deliveryAgentId && (
        <div style={{
          background: 'white', borderRadius: 16, padding: 24,
          boxShadow: '0 2px 12px rgba(0,0,0,0.07)', marginBottom: 24,
        }}>
          <h3 style={{ fontFamily: 'Syne', marginBottom: 16 }}>🛵 Your Delivery Partner</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 60, height: 60, borderRadius: '50%',
              background: 'var(--secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.8rem',
            }}>
              {order.deliveryAgentId.profileImage
                ? <img src={order.deliveryAgentId.profileImage} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%' }}/>
                : '🧑'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>
                {order.deliveryAgentId.name}
              </div>
              <div style={{ color: 'var(--gray)', fontSize: '0.85rem' }}>
                ⭐ {order.deliveryAgentId.rating} · Delivery Partner
              </div>
            </div>
            <a
              href={`tel:${order.deliveryAgentId.phone}`}
              className="btn btn-primary btn-sm"
            >
              📞 Call
            </a>
          </div>
        </div>
      )}

      {/* Order Summary */}
      <div style={{
        background: 'white', borderRadius: 16, padding: 24,
        boxShadow: '0 2px 12px rgba(0,0,0,0.07)', marginBottom: 24,
      }}>
        <h3 style={{ fontFamily: 'Syne', marginBottom: 16 }}>🧾 Order Summary</h3>
        {order.items?.map((item, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between',
            padding: '8px 0', borderBottom: '1px solid #F3F4F6',
            fontSize: '0.9rem',
          }}>
            <span>{item.name} × {item.quantity}</span>
            <span>₹{item.price * item.quantity}</span>
          </div>
        ))}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          marginTop: 12, fontWeight: 700,
        }}>
          <span>Total Paid</span>
          <span>₹{order.finalAmount}</span>
        </div>
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            className={`status-pill status-${order.paymentStatus}`}
            style={{ background: '#D1FAE5', color: '#059669' }}
          >
            {order.paymentStatus === 'paid' ? '✅ Paid' : '💵 Pay on Delivery'}
          </span>
          <span style={{ color: 'var(--gray)', fontSize: '0.85rem' }}>
            via {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}
          </span>
        </div>
      </div>

      {/* Delivery Address */}
      <div style={{
        background: 'white', borderRadius: 16, padding: 24,
        boxShadow: '0 2px 12px rgba(0,0,0,0.07)', marginBottom: 24,
      }}>
        <h3 style={{ fontFamily: 'Syne', marginBottom: 12 }}>📍 Delivering to</h3>
        <p style={{ color: 'var(--gray)' }}>{order.deliveryAddress?.fullAddress}</p>
      </div>

      <button
        className="btn btn-outline btn-full"
        onClick={() => navigate('/')}
      >
        ← Back to Home
      </button>
    </div>
  );
};

export default OrderTracking;
