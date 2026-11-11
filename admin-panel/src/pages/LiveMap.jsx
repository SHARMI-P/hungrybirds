// Every rider and active order on one OpenStreetMap, updated live.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import toast from 'react-hot-toast';
import api, { createSocket, errorMessage } from '../api';

const DHARWAD_HUBLI = [15.41, 75.07];
const pin = (emoji, cls = '') =>
  L.divIcon({ html: `<div class="pin ${cls}">${emoji}</div>`, className: 'pin-wrap', iconSize: [34, 34], iconAnchor: [17, 32], popupAnchor: [0, -28] });
const ICON = {
  free: pin('🛵', 'pin-free'),
  busy: pin('🛵', 'pin-busy'),
  offline: pin('🛵', 'pin-offline'),
  restaurant: pin('🍽️'),
  home: pin('🏠'),
};
const STATUS_LABEL = { placed: 'Placed', confirmed: 'Confirmed', preparing: 'Preparing', picked_up: 'Out for delivery' };
const ago = (d) => {
  if (!d) return 'never';
  const s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
  return s < 60 ? `${s}s ago` : s < 3600 ? `${Math.round(s / 60)}m ago` : `${Math.round(s / 3600)}h ago`;
};

const FitOnce = ({ points }) => {
  const map = useMap();
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (done || points.length === 0) return;
    map.fitBounds(points, { padding: [40, 40], maxZoom: 14 });
    setDone(true);
  }, [points, done, map]);
  return null;
};

const LiveMap = () => {
  const [agents, setAgents] = useState([]);
  const [orders, setOrders] = useState([]);
  const [showOffline, setShowOffline] = useState(false);
  const [, tick] = useState(0);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/live');
      setAgents(data.agents);
      setOrders(data.orders);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }, []);

  useEffect(() => {
    load();
    const socket = createSocket();
    socket.on('agent_location', ({ agentId, lat, lng, at }) =>
      setAgents((list) => list.map((a) => (a._id === agentId ? { ...a, lat, lng, lastLocationAt: at } : a))),
    );
    ['new_order', 'order_updated', 'agent_updated'].forEach((e) => socket.on(e, load));
    const timer = setInterval(() => tick((n) => n + 1), 15000); // refresh "x ago" labels
    return () => {
      socket.disconnect();
      clearInterval(timer);
    };
  }, [load]);

  const visible = agents.filter((a) => showOffline || a.isOnline);
  const points = useMemo(
    () => [...visible.map((a) => [a.lat, a.lng]), ...orders.flatMap((o) => [o.restaurant && [o.restaurant.lat, o.restaurant.lng], [o.home.lat, o.home.lng]].filter(Boolean))],
    [visible, orders],
  );
  const online = agents.filter((a) => a.isOnline);
  const riderName = (id) => agents.find((a) => a._id === id)?.name;

  return (
    <div>
      <div className="row between wrap gap-12" style={{ marginBottom: 16 }}>
        <h2 className="title" style={{ margin: 0 }}>Live map</h2>
        <div className="row gap-16 small">
          <span><span className="dot dot-free" /> Free ({online.filter((a) => a.isAvailable).length})</span>
          <span><span className="dot dot-busy" /> On delivery ({online.filter((a) => !a.isAvailable).length})</span>
          <label className="check"><input type="checkbox" checked={showOffline} onChange={(e) => setShowOffline(e.target.checked)} /> Show offline</label>
          <button type="button" className="btn btn-ghost btn-sm" onClick={load}>↻ Refresh</button>
        </div>
      </div>

      <div className="live-grid">
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <MapContainer center={DHARWAD_HUBLI} zoom={12} className="live-map">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />
            <FitOnce points={points} />
            {orders.map((o) => (
              <span key={o._id}>
                {o.restaurant && (
                  <Marker position={[o.restaurant.lat, o.restaurant.lng]} icon={ICON.restaurant}>
                    <Popup><b>{o.restaurantName}</b><br />#{o._id.slice(-8).toUpperCase()} · {STATUS_LABEL[o.status]}</Popup>
                  </Marker>
                )}
                <Marker position={[o.home.lat, o.home.lng]} icon={ICON.home}>
                  <Popup>Deliver to: {o.home.address}<br />₹{o.finalAmount}</Popup>
                </Marker>
                {o.restaurant && (
                  <Polyline positions={[[o.restaurant.lat, o.restaurant.lng], [o.home.lat, o.home.lng]]} pathOptions={{ color: o.status === 'picked_up' ? '#7C3AED' : '#FF4500', weight: 3, dashArray: '6 8', opacity: 0.7 }} />
                )}
              </span>
            ))}
            {visible.map((a) => (
              <Marker key={a._id} position={[a.lat, a.lng]} icon={!a.isOnline ? ICON.offline : a.isAvailable ? ICON.free : ICON.busy}>
                <Popup>
                  <b>{a.name}</b> · {a.vehicleType}<br />
                  {a.isOnline ? (a.isAvailable ? 'Free' : 'On delivery') : 'Offline'} · GPS {ago(a.lastLocationAt)}<br />
                  <a href={`tel:${a.phone}`}>{a.phone}</a>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        <aside className="card live-side">
          <h3>Active orders ({orders.length})</h3>
          {orders.length === 0 && <p className="muted small">No active orders right now.</p>}
          {orders.map((o) => (
            <div key={o._id} className="live-row">
              <div className="row between">
                <b className="small">{o.restaurantName}</b>
                <span className={`pill pill-${o.status}`}>{STATUS_LABEL[o.status]}</span>
              </div>
              <div className="muted small">🛵 {o.agentId ? riderName(o.agentId) || 'Assigned' : <span className="warn">No rider yet</span>}</div>
            </div>
          ))}
          <h3 style={{ marginTop: 16 }}>Riders online ({online.length})</h3>
          {online.map((a) => (
            <div key={a._id} className="live-row row between">
              <span className="small"><span className={`dot ${a.isAvailable ? 'dot-free' : 'dot-busy'}`} /> {a.name}</span>
              <span className="muted small">{ago(a.lastLocationAt)}</span>
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
};

export default LiveMap;
