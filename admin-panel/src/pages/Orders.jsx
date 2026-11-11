import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api, { createSocket, errorMessage } from '../api';

const STATUSES = ['scheduled', 'placed', 'confirmed', 'preparing', 'picked_up', 'delivered', 'cancelled'];
// Mirrors the server's state machine so the UI only offers valid moves.
const NEXT = { scheduled: ['placed', 'cancelled'], placed: ['confirmed', 'cancelled'], confirmed: ['preparing', 'cancelled'], preparing: ['picked_up', 'cancelled'], picked_up: ['delivered'] };
const LABEL = { picked_up: 'Out for delivery' };
const ACTION = { placed: 'Release now', confirmed: 'Confirm', preparing: 'Start preparing' };
const label = (s) => LABEL[s] || s.charAt(0).toUpperCase() + s.slice(1);
const inr = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

const Orders = () => {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ orders: [], total: 0, pages: 1 });
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(null);

  const load = useCallback(async () => {
    try {
      const [{ data: o }, { data: r }] = await Promise.all([
        api.get('/orders', { params: { status: status || undefined, page, limit: 20 } }),
        api.get('/agents'),
      ]);
      setData(o);
      setRiders(r);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    load();
  }, [load]);

  // Refresh live when anything changes.
  useEffect(() => {
    const socket = createSocket();
    socket.on('new_order', load);
    socket.on('order_updated', load);
    return () => socket.disconnect();
  }, [load]);

  const move = async (id, next) => {
    let reason;
    if (next === 'cancelled') {
       
      reason = window.prompt('Reason for cancelling (shown to the customer):', 'Restaurant unable to fulfil');
      if (reason === null) return;
    }
    try {
      await api.put(`/orders/${id}/status`, { status: next, reason });
      toast.success(`Order ${label(next).toLowerCase()}`);
      load();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const assign = async (id, agentId) => {
    if (!agentId) return;
    try {
      await api.put(`/orders/${id}/assign`, { agentId });
      toast.success('Rider assigned');
      load();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const freeRiders = riders.filter((r) => r.isAvailable);

  return (
    <div>
      <div className="row between wrap gap-12" style={{ marginBottom: 16 }}>
        <h2 className="title" style={{ margin: 0 }}>Orders ({data.total})</h2>
        <div className="segmented" role="group" aria-label="Filter by status">
          <button type="button" className={!status ? 'active' : ''} onClick={() => { setStatus(''); setPage(1); }}>All</button>
          {STATUSES.map((s) => (
            <button type="button" key={s} className={status === s ? 'active' : ''} onClick={() => { setStatus(s); setPage(1); }}>{label(s)}</button>
          ))}
        </div>
      </div>

      {loading ? <p className="muted">Loading…</p> : data.orders.length === 0 ? <p className="muted center" style={{ padding: 40 }}>No orders here.</p> : (
        <div className="stack gap-12">
          {data.orders.map((o) => (
            <div key={o._id} className="card order-card">
              <div className="row between wrap gap-12">
                <button type="button" className="order-head" onClick={() => setOpen(open === o._id ? null : o._id)} aria-expanded={open === o._id}>
                  <div className="bold">#{o._id.slice(-8).toUpperCase()} · {o.restaurantId?.name || o.restaurantName}</div>
                  <div className="muted small">
                    {o.userId?.name} · {o.items.length} items · {inr(o.finalAmount)} · {o.paymentMethod === 'cod' ? 'COD' : 'Online'} ({o.paymentStatus.replace('_', ' ')}) · {new Date(o.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>
                </button>
                <div className="row gap-8 wrap">
                  {o.scheduledFor && (
                    <span className="pill pill-scheduled" title="Scheduled delivery time">
                      🗓️ {new Date(o.scheduledFor).toLocaleString('en-IN', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}
                    </span>
                  )}
                  <span className={`pill pill-${o.orderStatus}`}>{label(o.orderStatus)}</span>
                  {(NEXT[o.orderStatus] || []).filter((n) => n !== 'picked_up' && n !== 'delivered').map((n) => (
                    <button type="button" key={n} className={`btn btn-sm ${n === 'cancelled' ? 'btn-danger' : 'btn-primary'}`} onClick={() => move(o._id, n)}>
                      {n === 'cancelled' ? 'Cancel' : `→ ${ACTION[n] || label(n)}`}
                    </button>
                  ))}
                </div>
              </div>

              {['placed', 'confirmed', 'preparing'].includes(o.orderStatus) && (
                <div className="row gap-8 small" style={{ marginTop: 10 }}>
                  🛵 {o.deliveryAgentId ? <b>{o.deliveryAgentId.name}</b> : <span className="warn">No rider yet</span>}
                  <select value="" onChange={(e) => assign(o._id, e.target.value)} aria-label="Assign rider">
                    <option value="">{o.deliveryAgentId ? 'Reassign…' : 'Assign rider…'}</option>
                    {freeRiders.map((r) => <option key={r._id} value={r._id}>{r.name}{r.isOnline ? '' : ' (offline)'}</option>)}
                  </select>
                </div>
              )}
              {['picked_up', 'delivered'].includes(o.orderStatus) && o.deliveryAgentId && <div className="muted small" style={{ marginTop: 8 }}>🛵 {o.deliveryAgentId.name}</div>}

              {open === o._id && (
                <div className="order-detail">
                  <div>
                    {o.items.map((i) => <div key={i.name} className="row between small"><span>{i.name} × {i.quantity}</span><span>{inr(i.price * i.quantity)}</span></div>)}
                    <div className="row between small muted"><span>Delivery ({o.distanceKm} km) + GST{o.discount ? ` − ${o.couponCode}` : ''}</span><span>{inr(o.deliveryFee + o.tax - o.discount)}</span></div>
                  </div>
                  <div className="small">
                    <div><b>Customer:</b> {o.userId?.name} · <a href={`tel:${o.userId?.phone}`}>{o.userId?.phone}</a></div>
                    <div><b>Deliver to:</b> {o.deliveryAddress.fullAddress}</div>
                    {o.cancelReason && <div><b>Cancel reason:</b> {o.cancelReason}</div>}
                    {o.review?.rating && <div><b>Review:</b> {'★'.repeat(o.review.rating)} {o.review.comment}</div>}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {data.pages > 1 && (
        <div className="row gap-12 center-row" style={{ marginTop: 20 }}>
          <button type="button" className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
          <span className="small">Page {page} of {data.pages}</span>
          <button type="button" className="btn btn-ghost btn-sm" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
};

export default Orders;
