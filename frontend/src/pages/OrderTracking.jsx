import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import API, { errorMessage } from '../api';
import { useT } from '../i18n';
import { createSocket } from '../lib/socket';
import { pointToLatLng, haversineKm } from '../lib/geo';
import { STATUS_STEPS, formatDateTime, formatSlot, paymentLabel, rupees, shortId, statusDesc, statusLabel } from '../lib/format';
import { DeliveryMap } from '../components/Maps';
import ChatBox from '../components/ChatBox';
import { Card, EmptyState, Loader, Stars, VegMark } from '../components/ui';

const ACTIVE = ['placed', 'confirmed', 'preparing', 'picked_up'];

const OrderTracking = () => {
  const { id } = useParams();
  const { t, locale } = useT();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [rider, setRider] = useState(null); // live { lat, lng }
  const [socket, setSocket] = useState(null);
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
    const s = createSocket();
    setSocket(s);
    s.on('connect', () => {
      setConnected(true);
      s.emit('join_order', id, () => {});
    });
    s.on('disconnect', () => setConnected(false));
    s.on('order_status_update', ({ status }) => {
      toast(statusLabel(status, t), { icon: STATUS_STEPS.find((x) => x.key === status)?.emoji || '📦', id: `status-${status}` });
      fetchOrder();
    });
    s.on('agent_assigned', fetchOrder);
    s.on('location_update', ({ lat, lng }) => setRider({ lat, lng }));
    return () => s.disconnect();
  }, [id, fetchOrder]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <Loader />;
  if (notFound || !order) return <EmptyState emoji="😕" title={t('track.notFound')} />;

  const status = order.orderStatus;
  const isActive = ACTIVE.includes(status);
  const isCancelled = status === 'cancelled';
  const isScheduled = status === 'scheduled';
  const stepIdx = STATUS_STEPS.findIndex((s) => s.key === status);
  const current = STATUS_STEPS[stepIdx];
  const restaurantLoc = pointToLatLng(order.restaurantId?.location);
  const home = { lat: order.deliveryAddress.lat, lng: order.deliveryAddress.lng };
  const kmLeft = rider && status === 'picked_up' ? haversineKm(rider, home) : null;
  const when = Object.fromEntries((order.statusHistory || []).map((h) => [h.status, h.at]));

  const cancel = async () => {
     
    if (!window.confirm(t('track.cancelConfirm'))) return;
    try {
      const { data } = await API.post(`/orders/${order._id}/cancel`, { reason: 'Cancelled by customer' });
      setOrder(data);
      toast.success(data.paymentStatus === 'refunded' ? t('track.cancelledRefund') : t('track.cancelled'));
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const heroTitle = isCancelled
    ? `❌ ${t('track.cancelledTitle')}`
    : isScheduled
      ? `🗓️ ${t('track.scheduledTitle')}`
      : status === 'awaiting_payment'
        ? `⏳ ${t('status.awaiting_payment')}`
        : `${current?.emoji} ${statusLabel(status, t)}`;

  const heroBody = isCancelled
    ? order.cancelReason
    : isScheduled
      ? t('track.scheduledBody', { time: formatSlot(order.scheduledFor, locale) })
      : current && statusDesc(status, t);

  return (
    <div className="page-container narrow">
      <div className={`status-hero ${isCancelled ? 'cancelled' : ''} ${isScheduled ? 'scheduled' : ''}`}>
        <h1>{heroTitle}</h1>
        <p>{heroBody}</p>
        <div className="small row gap-16 wrap" style={{ marginTop: 12, opacity: 0.9 }}>
          <span>{t('track.order', { id: shortId(order._id) })}</span>
          {isActive && !order.scheduledFor && <span>🕐 {t('track.eta', { eta: order.estimatedDelivery })}</span>}
          {order.scheduledFor && isActive && <span>🗓️ {formatSlot(order.scheduledFor, locale)}</span>}
          {kmLeft !== null && <span>🛵 {t('track.kmAway', { km: kmLeft.toFixed(1) })}</span>}
          {isActive && <span>{connected ? `🟢 ${t('track.live')}` : `⚪ ${t('track.reconnecting')}`}</span>}
        </div>
      </div>

      {isActive && restaurantLoc && (
        <Card title={`🗺️ ${t('track.liveTracking')}`}>
          <DeliveryMap restaurant={restaurantLoc} home={home} rider={order.deliveryAgentId ? rider : null} restaurantName={order.restaurantName} />
          {!order.deliveryAgentId && <p className="muted small" style={{ marginTop: 8 }}>{t('track.findingRider')}</p>}
        </Card>
      )}

      {!isCancelled && !isScheduled && status !== 'awaiting_payment' && (
        <Card title={t('track.progress')}>
          <ol className="tracking-steps">
            {STATUS_STEPS.map((step, idx) => {
              const state = idx < stepIdx ? 'done' : idx === stepIdx ? 'active' : '';
              return (
                <li key={step.key} className={`step ${state}`}>
                  <div className="step-icon">{idx < stepIdx ? '✓' : step.emoji}</div>
                  <div>
                    <div className="bold">{statusLabel(step.key, t)}</div>
                    <div className="muted small">{when[step.key] ? formatDateTime(when[step.key], locale) : statusDesc(step.key, t)}</div>
                  </div>
                  {idx < STATUS_STEPS.length - 1 && <div className="step-line" />}
                </li>
              );
            })}
          </ol>
        </Card>
      )}

      {order.deliveryAgentId && isActive && (
        <Card title={`🛵 ${t('track.partner')}`}>
          <div className="row gap-16">
            <div className="avatar">{order.deliveryAgentId.profileImage ? <img src={order.deliveryAgentId.profileImage} alt="" /> : '🧑'}</div>
            <div style={{ flex: 1 }}>
              <div className="bold">{order.deliveryAgentId.name}</div>
              <div className="muted small">⭐ {order.deliveryAgentId.rating} · {order.deliveryAgentId.vehicleType} {order.deliveryAgentId.vehicleNumber}</div>
            </div>
            <a href={`tel:${order.deliveryAgentId.phone}`} className="btn btn-primary btn-sm">📞 {t('track.call')}</a>
          </div>
          <h4 className="chat-title">💬 {t('chat.withRider', { name: order.deliveryAgentId.name.split(' ')[0] })}</h4>
          <ChatBox orderId={order._id} socket={socket} myRole="customer" quickReplies={[t('chat.q.bell'), t('chat.q.gate'), t('chat.q.call')]} />
        </Card>
      )}

      {status === 'delivered' && <ReviewBox order={order} onDone={setOrder} />}

      <Card title={`🧾 ${t('track.bill')}`}>
        {order.items.map((item) => (
          <div key={item.menuItemId || item.name} className="bill-row">
            <span className="row gap-8"><VegMark veg={item.isVeg} /> {item.name} × {item.quantity}</span>
            <span>{rupees(item.price * item.quantity)}</span>
          </div>
        ))}
        <div className="bill">
          <div className="bill-row"><span>{t('bill.itemTotal')}</span><span>{rupees(order.subtotal)}</span></div>
          {order.discount > 0 && <div className="bill-row success"><span>{t('bill.coupon', { code: order.couponCode })}</span><span>− {rupees(order.discount)}</span></div>}
          <div className="bill-row"><span>{t('bill.deliveryKm', { km: order.distanceKm })}</span><span>{rupees(order.deliveryFee)}</span></div>
          <div className="bill-row"><span>{t('bill.gstShort')}</span><span>{rupees(order.tax)}</span></div>
          <div className="bill-row total"><span>{t('bill.total')}</span><span>{rupees(order.finalAmount)}</span></div>
        </div>
        <div className="row gap-8" style={{ marginTop: 8 }}>
          <span className="status-pill status-delivered">{paymentLabel(order, t)}</span>
          <span className="muted small">{order.paymentMethod === 'cod' ? t('checkout.cod') : t('checkout.online')}</span>
        </div>
      </Card>

      <Card title={`📍 ${t('track.deliveringTo')}`}>
        <p className="muted">{order.deliveryAddress?.fullAddress}</p>
      </Card>

      <div className="stack gap-12">
        {['placed', 'awaiting_payment', 'scheduled'].includes(status) && (
          <button type="button" className="btn btn-danger btn-full" onClick={cancel}>{t('track.cancel')}</button>
        )}
        <Link to="/orders" className="btn btn-outline btn-full">← {t('nav.myOrders')}</Link>
      </div>
    </div>
  );
};

const ReviewBox = ({ order, onDone }) => {
  const { t } = useT();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  if (order.review?.rating) {
    return (
      <Card title={`⭐ ${t('review.yours')}`}>
        <Stars value={order.review.rating} />
        {order.review.comment && <p className="muted" style={{ marginTop: 6 }}>{order.review.comment}</p>}
      </Card>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    if (!rating) return toast.error(t('review.pickStars'));
    setSaving(true);
    try {
      const { data } = await API.post(`/orders/${order._id}/review`, { rating, comment });
      onDone({ ...order, review: data.review });
      toast.success(t('review.thanks'));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title={t('review.howWas', { name: order.restaurantName })}>
      <form onSubmit={submit}>
        <Stars value={rating} onChange={setRating} size="2rem" />
        <div className="input-group" style={{ marginTop: 12 }}>
          <textarea rows={2} maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t('review.placeholder')} aria-label={t('review.placeholder')} />
        </div>
        <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>{saving ? t('common.saving') : t('review.submit')}</button>
      </form>
    </Card>
  );
};

export default OrderTracking;
