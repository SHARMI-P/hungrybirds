// Rider app: go online, share live GPS, chat with the customer, and move the current order along.
import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import API, { errorMessage } from '../api';
import { useT } from '../i18n';
import { createSocket } from '../lib/socket';
import { pointToLatLng } from '../lib/geo';
import { rupees, shortId, statusLabel } from '../lib/format';
import { DeliveryMap } from '../components/Maps';
import ChatBox from '../components/ChatBox';
import { Card, EmptyState, Loader } from '../components/ui';

const osmDirections = (from, to) =>
  `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${from.lat}%2C${from.lng}%3B${to.lat}%2C${to.lng}`;

const Rider = () => {
  const { t } = useT();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [position, setPosition] = useState(null);
  const [sharing, setSharing] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [socket, setSocket] = useState(null);
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

  const send = useCallback(
    (point) => {
      setPosition(point);
      socket?.emit('agent_location_update', point);
    },
    [socket],
  );

  useEffect(() => {
    refresh();
    const s = createSocket();
    setSocket(s);
    s.on('order_assigned', () => {
      toast.success(t('rider.newOrder'), { duration: 6000 });
      refresh();
    });
    return () => {
      s.disconnect();
      if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current);
      clearInterval(simRef.current);
    };
  }, [refresh]); // eslint-disable-line react-hooks/exhaustive-deps

  // Join the order's room so chat messages arrive live.
  const orderId = data?.currentOrder?._id;
  useEffect(() => {
    if (!socket || !orderId) return undefined;
    const join = () => socket.emit('join_order', orderId, () => {});
    if (socket.connected) join();
    socket.on('connect', join);
    return () => {
      socket.off('connect', join);
      socket.emit('leave_order', orderId);
    };
  }, [socket, orderId]);

  const startSharing = () => {
    if (!navigator.geolocation) return toast.error(t('rider.noGps'));
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => send({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        toast.error(err.code === 1 ? t('rider.gpsDenied') : t('rider.gpsLost'));
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
      if (isOnline && !sharing) startSharing(); // report a location so dispatch can find this rider
      await API.put('/agents/me/status', { isOnline });
      if (!isOnline) stopSharing();
      toast.success(isOnline ? t('rider.nowOnline') : t('rider.nowOffline'));
      refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const setStatus = async (status) => {
    try {
      await API.put(`/orders/${data.currentOrder._id}/status`, { status });
      toast.success(status === 'delivered' ? t('rider.deliveredToast') : t('rider.pickedToast'));
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
  if (!data) return <EmptyState emoji="🛵" title={t('rider.noProfile')} />;

  const { agent, currentOrder: order } = data;
  const restaurant = order ? pointToLatLng(order.restaurantId?.location) : null;
  const home = order ? { lat: order.deliveryAddress.lat, lng: order.deliveryAddress.lng } : null;

  return (
    <div className="page-container narrow">
      <div className="row between wrap gap-12" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="section-title" style={{ margin: 0 }}>🛵 {t('nav.hi', { name: agent.name.split(' ')[0] })}</h1>
          <p className="muted small">⭐ {agent.rating} · {t('rider.deliveries', { n: agent.totalDeliveries })} · {agent.vehicleType} {agent.vehicleNumber}</p>
        </div>
        <label className={`switch ${agent.isOnline ? 'on' : ''}`}>
          <input type="checkbox" checked={agent.isOnline} onChange={(e) => setOnline(e.target.checked)} disabled={Boolean(order) && agent.isOnline} />
          <span>{agent.isOnline ? `🟢 ${t('rider.online')}` : `⚫ ${t('rider.offline')}`}</span>
        </label>
      </div>

      {agent.isOnline && (
        <div className={`alert ${sharing || simulating ? 'alert-success' : 'alert-warn'} small`}>
          {simulating ? `🧪 ${t('rider.simulating')}` : sharing ? `📡 ${t('rider.sharing')}` : `📡 ${t('rider.sharingOff')}`}{' '}
          {!sharing && !simulating && <button type="button" className="link" onClick={startSharing}>{t('rider.turnOn')}</button>}
        </div>
      )}

      {!order ? (
        <EmptyState emoji={agent.isOnline ? '⏳' : '😴'} title={agent.isOnline ? t('rider.waiting') : t('rider.youreOffline')}>
          <p>{agent.isOnline ? t('rider.waitingHint') : t('rider.offlineHint')}</p>
        </EmptyState>
      ) : (
        <>
          <Card title={`${t('track.order', { id: shortId(order._id) })} · ${statusLabel(order.orderStatus, t)}`}>
            {restaurant && <DeliveryMap restaurant={restaurant} home={home} rider={position} restaurantName={order.restaurantId.name} />}
            <div className="rider-legs">
              <div>
                <div className="muted small">{t('rider.pickup')}</div>
                <div className="bold">{order.restaurantId.name}</div>
                <div className="small">{order.restaurantId.address}</div>
                {position && restaurant && <a className="link small" href={osmDirections(position, restaurant)} target="_blank" rel="noreferrer">{t('rider.directions')} ↗</a>}
              </div>
              <div>
                <div className="muted small">{t('rider.drop')}</div>
                <div className="bold">{order.userId?.name}</div>
                <div className="small">{order.deliveryAddress.fullAddress}</div>
                <div className="row gap-12">
                  {restaurant && <a className="link small" href={osmDirections(restaurant, home)} target="_blank" rel="noreferrer">{t('rider.directions')} ↗</a>}
                  {order.userId?.phone && <a className="link small" href={`tel:${order.userId.phone}`}>📞 {t('rider.callCustomer')}</a>}
                </div>
              </div>
            </div>
            <div className="bill-row bold" style={{ marginTop: 12 }}>
              <span>{order.paymentMethod === 'cod' ? `💵 ${t('rider.collectCash')}` : `✅ ${t('rider.prepaid')}`}</span>
              <span>{order.paymentMethod === 'cod' ? rupees(order.finalAmount) : '—'}</span>
            </div>
            <div className="muted small">{order.items.map((i) => `${i.name} × ${i.quantity}`).join(', ')}</div>
          </Card>

          <Card title={`💬 ${t('chat.withCustomer', { name: order.userId?.name?.split(' ')[0] || '' })}`}>
            <ChatBox orderId={order._id} socket={socket} myRole="agent" quickReplies={[t('chat.q.atRestaurant'), t('chat.q.onWay'), t('chat.q.atDoor')]} />
          </Card>

          <div className="stack gap-12">
            {order.orderStatus === 'preparing' && <button type="button" className="btn btn-primary btn-full btn-lg" onClick={() => setStatus('picked_up')}>📦 {t('rider.markPicked')}</button>}
            {['placed', 'confirmed'].includes(order.orderStatus) && <div className="alert alert-warn small">{t('rider.headToRestaurant')}</div>}
            {order.orderStatus === 'picked_up' && <button type="button" className="btn btn-primary btn-full btn-lg" onClick={() => setStatus('delivered')}>✅ {t('rider.markDelivered')}</button>}
            <button type="button" className="btn btn-ghost btn-full" onClick={simulate} disabled={simulating}>🧪 {t('rider.simulate')}</button>
          </div>
        </>
      )}
    </div>
  );
};

export default Rider;
