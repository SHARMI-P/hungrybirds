import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, NavLink, Navigate, Route, Routes } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import api, { createSocket, getToken, setToken, setUnauthorizedHandler } from './api';
import Login from './pages/Login';
import Orders from './pages/Orders';
import Restaurants from './pages/Restaurants';
import Menu from './pages/Menu';
import Riders from './pages/Riders';
import Coupons from './pages/Coupons';

const Dashboard = lazy(() => import('./pages/Dashboard')); // recharts only loads here
const LiveMap = lazy(() => import('./pages/LiveMap')); // leaflet only loads here

const TABS = [
  { to: '/dashboard', label: '📊 Dashboard' },
  { to: '/orders', label: '📦 Orders' },
  { to: '/live', label: '🗺️ Live map' },
  { to: '/restaurants', label: '🏪 Restaurants' },
  { to: '/menu', label: '🍽️ Menu' },
  { to: '/riders', label: '🛵 Riders' },
  { to: '/coupons', label: '🎟️ Coupons' },
];

const AdminApp = () => {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(Boolean(getToken()));
  const [newOrders, setNewOrders] = useState(0);

  const logout = (msg) => {
    setToken('');
    setUser(null);
    if (msg) toast.error(msg);
  };

  // Validate a stored token instead of trusting it blindly.
  useEffect(() => {
    setUnauthorizedHandler(() => logout('Session expired — please sign in again'));
    if (!getToken()) return;
    api
      .get('/auth/me')
      .then(({ data }) => (data.role === 'admin' ? setUser(data) : logout('Admin access only')))
      .catch(() => logout())
      .finally(() => setChecking(false));
  }, []);

  // Live notifications for new orders.
  useEffect(() => {
    if (!user) return undefined;
    const socket = createSocket();
    socket.on('new_order', () => {
      setNewOrders((n) => n + 1);
      toast('New order received!', { icon: '🔔', duration: 5000 });
    });
    return () => socket.disconnect();
  }, [user]);

  if (checking) return <div className="center-screen">Loading…</div>;

  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      {!user ? (
        <Login onLogin={setUser} />
      ) : (
        <div className="shell">
          <header className="topbar">
            <span className="brand">🐦 HungryBirds Admin</span>
            <div className="row gap-12">
              <span className="muted small hide-sm">{user.email}</span>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => logout()}>Logout</button>
            </div>
          </header>
          <nav className="tabs" aria-label="Sections">
            {TABS.map((t) => (
              <NavLink key={t.to} to={t.to} className="tab" onClick={() => t.to === '/orders' && setNewOrders(0)}>
                {t.label}
                {t.to === '/orders' && newOrders > 0 && <span className="badge">{newOrders}</span>}
              </NavLink>
            ))}
          </nav>
          <main className="content">
            <Routes>
              <Route path="/dashboard" element={<Suspense fallback={<p className="muted">Loading…</p>}><Dashboard /></Suspense>} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/live" element={<Suspense fallback={<p className="muted">Loading map…</p>}><LiveMap /></Suspense>} />
              <Route path="/restaurants" element={<Restaurants />} />
              <Route path="/menu" element={<Menu />} />
              <Route path="/riders" element={<Riders />} />
              <Route path="/coupons" element={<Coupons />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
        </div>
      )}
    </BrowserRouter>
  );
};

export default AdminApp;
