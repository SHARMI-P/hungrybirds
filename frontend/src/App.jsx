import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import { EmptyState, Loader } from './components/ui';
import Home from './pages/Home';
import Restaurant from './pages/Restaurant';
import Cart from './pages/Cart';
import Orders from './pages/Orders';
import Login from './pages/Login';
import Register from './pages/Register';

// Map-heavy pages are code-split so Leaflet only loads when needed.
const Checkout = lazy(() => import('./pages/Checkout'));
const OrderTracking = lazy(() => import('./pages/OrderTracking'));
const Rider = lazy(() => import('./pages/Rider'));

const NotFound = () => (
  <EmptyState emoji="🧭" title="Page not found">
    <p>That page flew away.</p>
  </EmptyState>
);

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <Navbar />
          <Toaster position="top-center" toastOptions={{ duration: 3000, style: { fontFamily: 'DM Sans', fontWeight: 500 } }} />
          <main>
            <Suspense fallback={<Loader />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/restaurant/:id" element={<Restaurant />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<ProtectedRoute roles={['customer', 'admin']}><Checkout /></ProtectedRoute>} />
                <Route path="/payment" element={<Navigate to="/checkout" replace />} />
                <Route path="/order/:id" element={<ProtectedRoute><OrderTracking /></ProtectedRoute>} />
                <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
                <Route path="/rider" element={<ProtectedRoute roles={['agent']}><Rider /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </main>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
