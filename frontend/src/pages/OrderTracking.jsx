import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import API, { errorMessage } from '../api';
import { createSocket } from '../lib/socket';
import { pointToLatLng, haversineKm } from '../lib/geo';
import { STATUS_STEPS, formatDateTime, paymentLabel, rupees, shortId, statusLabel } from '../lib/format';
import { DeliveryMap } from '../components/Maps';
import { Card, EmptyState, Loader, Stars, VegMark } from '../components/ui';

const ACTIVE = ['placed', 'confirmed', 'preparing', 'picked_up'];

const OrderTracking = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [rider, setRider] = useState(null); // live { lat, lng }
  const [connected, setConnected] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      const { data } = await API.get(`/orders/${id}`);
      setOrder(data);
      const loc = pointToLatLng(data.deliveryAgentId?.location);
      if (loc && (loc.lat || loc.lng)) setRider((r) => r || loc);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
    const socket = createSocket();
    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join_order', id, () => {});
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('order_status_update', ({ status }) => {
      toast(statusLabel(status), { icon: STATUS_STEPS.find((s) => s.key === status)?.emoji || '📦', id: `status-${status}` });
      fetchOrder();
    });
    socket.on('agent_assigned', fetchOrder);
    socket.on('location_update', ({ lat, lng }) => setRider({ lat, lng }));
    return () => socket.disconnect();
  }, [id, fetchOrder]);

  if (loading) return <Loader />;
  if (notFound || !order) return <EmptyState emoji="😕" title="Order not found" />;

  const isActive = ACTIVE.includes(order.orderStatus);
  const isCancelled = order.orderStatus === 'cancelled';
  const stepIdx = STATUS_STEPS.findIndex((s) => s.key === order.orderStatus);
  const current = STATUS_STEPS[stepIdx];
  const restaurantLoc = pointToLatLng(order.restaurantId?.location);
  const home = { lat: order.deliveryAddress.lat, lng: order.deliveryAddress.lng };
  const kmLeft = rider && order.orderStatus === 'picked_up' ? haversineKm(rider, home) : null;
  const when = Object.fromEntries((order.statusHistory || []).map((h) => [h.status, h.at]));

  const cancel = async () => {
     
    if (!window.confirm('Cancel this order?')) return;
    try {
      const { data } = await API.post(`/orders/${order._id}/cancel`, { reason: 'Cancelled by customer' });
      setOrder(data);
      toast.success(data.paymentStatus === 'refunded' ? 'Order cancelled — refund initiated' : 'Order cancelled');
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <div className="page-container narrow">
      <div className={`status-hero ${isCancelled ? 'cancelled' : ''}`}>
        <h1>
          {isCancelled ? '❌ Order cancelled' : order.orderStatus === 'awaiting_payment' ? '⏳ Waiting for payment' : `${current?.emoji} ${current?.label}`}
        </h1>
        <p>{isCancelled ? order.cancelReason : current?.desc}</p>
        <div className="small row gap-16 wrap" style={{ marginTop: 12, opacity: 0.9 }}>
          <span>Order {shortId(order._id)}</span>
          {isActive && <span>🕐 ETA {order.estimatedDelivery}</span>}
          {kmLeft !== null && <span>🛵 {kmLeft.toFixed(1)} km away</span>}
          {isActive && <span title="Live updates">{connected ? '🟢 Live' : '⚪ Reconnecting…'}</span>}
        </div>
      </div>

      {isActive && restaurantLoc && (
        <Card title="🗺️ Live tracking">
          <DeliveryMap restaurant={restaurantLoc} home={home} rider={order.deliveryAgentId ? rider : null} restaurantName={order.restaurantName} />
          {!order.deliveryAgentId && <p className="muted small" style={{ marginTop: 8 }}>Finding a delivery partner near the restaurant…</p>}
        </Card>
      )}

      {!isCancelled && order.orderStatus !== 'awaiting_payment' && (
        <Card title="Progress">
          <ol className="tracking-steps">
            {STATUS_STEPS.map((step, idx) => {
              const state = idx < stepIdx ? 'done' : idx === stepIdx ? 'active' : '';
              return (
                <li key={step.key} className={`step ${state}`}>
                  <div className="step-icon">{idx < stepIdx ? '✓' : step.emoji}</div>
                  <div>
                    <div className="bold">{step.label}</div>
                    <div className="muted small">{when[step.key] ? formatDateTime(when[step.key]) : step.desc}</div>
                  </div>
                  {idx < STATUS_STEPS.length - 1 && <div className="step-line" />}
                </li>
              );
            })}
          </ol>
        </Card>
      )}

      {order.deliveryAgentId && isActive && (
        <Card title="🛵 Your delivery partner">
          <div className="row gap-16">
            <div className="avatar">{order.deliveryAgentId.profileImage ? <img src={order.deliveryAgentId.profileImage} alt="" /> : '🧑'}</div>
            <div style={{ flex: 1 }}>
              <div className="bold">{order.deliveryAgentId.name}</div>
              <div className="muted small">⭐ {order.deliveryAgentId.rating} · {order.deliveryAgentId.vehicleType} {order.deliveryAgentId.vehicleNumber}</div>
            </div>
            <a href={`tel:${order.deliveryAgentId.phone}`} className="btn btn-primary btn-sm">📞 Call</a>
          </div>
        </Card>
      )}

      {order.orderStatus === 'delivered' && <ReviewBox order={order} onDone={setOrder} />}

      <Card title="🧾 Bill">
        {order.items.map((item) => (
          <div key={item.menuItemId || item.name} className="bill-row">
            <span className="row gap-8"><VegMark veg={item.isVeg} /> {item.name} × {item.quantity}</span>
            <span>{rupees(item.price * item.quantity)}</span>
          </div>
        ))}
        <div className="bill">
          <div className="bill-row"><span>Item total</span><span>{rupees(order.subtotal)}</span></div>
          {order.discount > 0 && <div className="bill-row success"><span>Coupon {order.couponCode}</span><span>− {rupees(order.discount)}</span></div>}
          <div className="bill-row"><span>Delivery fee ({order.distanceKm} km)</span><span>{rupees(order.deliveryFee)}</span></div>
          <div className="bill-row"><span>GST</span><span>{rupees(order.tax)}</span></div>
          <div className="bill-row total"><span>Total</span><span>{rupees(order.finalAmount)}</span></div>
        </div>
        <div className="row gap-8" style={{ marginTop: 8 }}>
          <span className="status-pill status-delivered">{paymentLabel(order)}</span>
          <span className="muted small">via {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online payment'}</span>
        </div>
      </Card>

      <Card title="📍 Delivering to">
        <p className="muted">{order.deliveryAddress?.fullAddress}</p>
      </Card>

      <div className="stack gap-12">
        {['placed', 'awaiting_payment'].includes(order.orderStatus) && (
          <button type="button" className="btn btn-danger btn-full" onClick={cancel}>Cancel order</button>
        )}
        <Link to="/orders" className="btn btn-outline btn-full">← My orders</Link>
      </div>
    </div>
  );
};

const ReviewBox = ({ order, onDone }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  if (order.review?.rating) {
    return (
      <Card title="⭐ Your review">
        <Stars value={order.review.rating} />
        {order.review.comment && <p className="muted" style={{ marginTop: 6 }}>{order.review.comment}</p>}
      </Card>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    if (!rating) return toast.error('Pick a star rating');
    setSaving(true);
    try {
      const { data } = await API.post(`/orders/${order._id}/review`, { rating, comment });
      onDone({ ...order, review: data.review });
      toast.success('Thanks for your review! 💛');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title={`How was ${order.restaurantName}?`}>
      <form onSubmit={submit}>
        <Stars value={rating} onChange={setRating} size="2rem" />
        <div className="input-group" style={{ marginTop: 12 }}>
          <textarea rows={2} maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Tell others what you liked (optional)" aria-label="Review comment" />
        </div>
        <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>{saving ? 'Saving…' : 'Submit review'}</button>
      </form>
    </Card>
  );
};

export default OrderTracking;
