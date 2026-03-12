import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

import Home          from './pages/Home';
import Restaurant    from './pages/Restaurant';
import Cart          from './pages/Cart';
import Payment       from './pages/Payment';
import OrderTracking from './pages/OrderTracking';
import Orders        from './pages/Orders';
import Login         from './pages/Login';
import Register      from './pages/Register';

import './index.css';

// Load Razorpay script
const script = document.createElement('script');
script.src = 'https://checkout.razorpay.com/v1/checkout.js';
document.head.appendChild(script);

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <Navbar />
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3000,
              style: { fontFamily: 'DM Sans', fontWeight: 500 },
            }}
          />
          <Routes>
            <Route path="/"                    element={<Home />} />
            <Route path="/restaurant/:id"      element={<Restaurant />} />
            <Route path="/login"               element={<Login />} />
            <Route path="/register"            element={<Register />} />
            <Route path="/cart"                element={<Cart />} />
            <Route path="/payment"             element={<ProtectedRoute><Payment /></ProtectedRoute>} />
            <Route path="/order/:id"           element={<ProtectedRoute><OrderTracking /></ProtectedRoute>} />
            <Route path="/orders"              element={<ProtectedRoute><Orders /></ProtectedRoute>} />
          </Routes>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
