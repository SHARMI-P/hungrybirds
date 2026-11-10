// Rider app: go online, share live GPS, and move the current order along.
import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import API, { errorMessage } from '../api';
import { createSocket } from '../lib/socket';
import { pointToLatLng } from '../lib/geo';
import { rupees, shortId, statusLabel } from '../lib/format';
import { DeliveryMap } from '../components/Maps';
import { Card, EmptyState, Loader } from '../components/ui';

const osmDirections = (from, to) =>
  `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${from.lat}%2C${from.lng}%3B${to.lat}%2C${to.lng}`;

const Rider = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [position, setPosition] = useState(null);
  const [sharing, setSharing] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const socketRef = useRef(null);
  const watchRef = useRef(null);
  const simRef = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const { data: d } = await API.get('/agents/me');
      setData(d);
      const loc = pointToLatLng(d.agent.location);
      if (loc && (loc.lat || loc.lng)) setPosition((p) => p || loc);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const send = useCallback((point) => {
    setPosition(point);
    socketRef.current?.emit('agent_location_update', point);
  }, []);

  useEffect(() => {
    refresh();
    const socket = createSocket();
    socketRef.current = socket;
    socket.on('order_assigned', () => {
      toast.success('New delivery assigned! 🛵', { duration: 6000 });
      refresh();
    });
    return () => {
      socket.disconnect();
      if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current);
      clearInterval(simRef.current);
    };
  }, [refresh]);

  const startSharing = () => {
    if (!navigator.geolocation) return toast.error('GPS is not available on this device');
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => send({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        toast.error(err.code === 1 ? 'Location permission denied' : 'GPS signal lost');
        setSharing(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
    setSharing(true);
  };

  const stopSharing = () => {
    if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current);
    watchRef.current = null;
    setSharing(false);
  };

  const setOnline = async (isOnline) => {
    try {
      // Report a location first so the dispatcher can find this rider.
      if (isOnline && !sharing) startSharing();
      await API.put('/agents/me/status', { isOnline });
      if (!isOnline) stopSharing();
      toast.success(isOnline ? "You're online — waiting for orders" : "You're offline");
      refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const setStatus = async (status) => {
    try {
      await API.put(`/orders/${data.currentOrder._id}/status`, { status });
      toast.success(status === 'delivered' ? 'Delivered! Great job 🎉' : 'Marked as picked up');
      if (status === 'delivered') {
        clearInterval(simRef.current);
        setSimulating(false);
      }
      refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  // Demo helper: glide the rider from where they are → restaurant → customer.
  const simulate = () => {
    const order = data.currentOrder;
    const restaurant = pointToLatLng(order.restaurantId.location);
    const home = { lat: order.deliveryAddress.lat, lng: order.deliveryAddress.lng };
    const start = position || restaurant;
    const legs = order.orderStatus === 'picked_up' ? [[start, home]] : [[start, restaurant], [restaurant, home]];
    const steps = legs.flatMap(([a, b]) =>
      Array.from({ length: 15 }, (_, i) => ({ lat: a.lat + ((b.lat - a.lat) * (i + 1)) / 15, lng: a.lng + ((b.lng - a.lng) * (i + 1)) / 15 })),
    );
    stopSharing();
    clearInterval(simRef.current);
    setSimulating(true);
    let i = 0;
    simRef.current = setInterval(() => {
      if (i >= steps.length) {
        clearInterval(simRef.current);
        setSimulating(false);
        return;
      }
      send(steps[i]);
      i += 1;
    }, 2100);
  };

  if (loading) return <Loader />;
  if (!data) return <EmptyState emoji="🛵" title="Rider profile not found" />;

  const { agent, currentOrder: order } = data;
  const restaurant = order ? pointToLatLng(order.restaurantId?.location) : null;
  const home = order ? { lat: order.deliveryAddress.lat, lng: order.deliveryAddress.lng } : null;

  return (
    <div className="page-container narrow">
      <div className="row between wrap gap-12" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="section-title" style={{ margin: 0 }}>🛵 Hi, {agent.name.split(' ')[0]}</h1>
          <p className="muted small">⭐ {agent.rating} · {agent.totalDeliveries} deliveries · {agent.vehicleType} {agent.vehicleNumber}</p>
        </div>
        <label className={`switch ${agent.isOnline ? 'on' : ''}`}>
          <input type="checkbox" checked={agent.isOnline} onChange={(e) => setOnline(e.target.checked)} disabled={Boolean(order) && agent.isOnline} />
          <span>{agent.isOnline ? '🟢 Online' : '⚫ Offline'}</span>
        </label>
      </div>

      {agent.isOnline && (
        <div className={`alert ${sharing || simulating ? 'alert-success' : 'alert-warn'} small`}>
          {simulating ? '🧪 Simulating a ride for demo…' : sharing ? '📡 Sharing live location with customers' : '📡 Location sharing is off.'}{' '}
          {!sharing && !simulating && <button type="button" className="link" onClick={startSharing}>Turn on</button>}
        </div>
      )}

      {!order ? (
        <EmptyState emoji={agent.isOnline ? '⏳' : '😴'} title={agent.isOnline ? 'Waiting for the next order' : "You're offline"}>
          <p>{agent.isOnline ? 'New orders near you are assigned automatically.' : 'Go online to start receiving deliveries.'}</p>
        </EmptyState>
      ) : (
        <>
          <Card title={`Order ${shortId(order._id)} · ${statusLabel(order.orderStatus)}`}>
            {restaurant && <DeliveryMap restaurant={restaurant} home={home} rider={position} restaurantName={order.restaurantId.name} />}
            <div className="rider-legs">
              <div>
                <div className="muted small">PICK UP</div>
                <div className="bold">{order.restaurantId.name}</div>
                <div className="small">{order.restaurantId.address}</div>
                {position && restaurant && <a className="link small" href={osmDirections(position, restaurant)} target="_blank" rel="noreferrer">Directions ↗</a>}
              </div>
              <div>
                <div className="muted small">DROP</div>
                <div className="bold">{order.userId?.name}</div>
                <div className="small">{order.deliveryAddress.fullAddress}</div>
                <div className="row gap-12">
                  {restaurant && <a className="link small" href={osmDirections(restaurant, home)} target="_blank" rel="noreferrer">Directions ↗</a>}
                  {order.userId?.phone && <a className="link small" href={`tel:${order.userId.phone}`}>📞 Call customer</a>}
                </div>
              </div>
            </div>
            <div className="bill-row bold" style={{ marginTop: 12 }}>
              <span>{order.paymentMethod === 'cod' ? '💵 Collect cash' : '✅ Prepaid'}</span>
              <span>{order.paymentMethod === 'cod' ? rupees(order.finalAmount) : '—'}</span>
            </div>
            <div className="muted small">{order.items.map((i) => `${i.name} × ${i.quantity}`).join(', ')}</div>
          </Card>

          <div className="stack gap-12">
            {order.orderStatus === 'preparing' && <button type="button" className="btn btn-primary btn-full btn-lg" onClick={() => setStatus('picked_up')}>📦 Picked up from restaurant</button>}
            {['placed', 'confirmed'].includes(order.orderStatus) && <div className="alert alert-warn small">Head to the restaurant — you can mark pickup once they start preparing.</div>}
            {order.orderStatus === 'picked_up' && <button type="button" className="btn btn-primary btn-full btn-lg" onClick={() => setStatus('delivered')}>✅ Mark as delivered</button>}
            <button type="button" className="btn btn-ghost btn-full" onClick={simulate} disabled={simulating}>🧪 Simulate ride (demo)</button>
          </div>
        </>
      )}
    </div>
  );
};

export default Rider;
