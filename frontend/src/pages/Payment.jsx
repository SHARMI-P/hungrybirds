import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import API from '../api';
import toast from 'react-hot-toast';

const Payment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { cart, clearCart } = useCart();
  const { user } = useAuth();

  const { total, subtotal, deliveryFee, gst } = location.state || {};

  const [address, setAddress]   = useState('');
  const [lat, setLat]           = useState('');
  const [lng, setLng]           = useState('');
  const [method, setMethod]     = useState('razorpay'); // 'razorpay' or 'cod'
  const [loading, setLoading]   = useState(false);

  // Detect current location for delivery
  const detectLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude, longitude } = pos.coords;
        setLat(latitude);
        setLng(longitude);
        try {
          const key = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
          const res = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${key}`
          );
          const data = await res.json();
          if (data.results[0]) setAddress(data.results[0].formatted_address);
        } catch {
          setAddress(`Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`);
        }
      });
    }
  };

  const placeOrder = async (paymentInfo = {}) => {
    if (!address || !lat || !lng) {
      toast.error('Please add a delivery address and detect location');
      return;
    }

    try {
      setLoading(true);
      const orderData = {
        restaurantId:    cart.restaurantId,
        restaurantName:  cart.restaurantName,
        items:           cart.items.map(i => ({
          menuItemId: i._id,
          name:       i.name,
          price:      i.price,
          quantity:   i.quantity,
          image:      i.image,
        })),
        subtotal,
        deliveryFee,
        discount:      0,
        finalAmount:   total,
        paymentMethod: method,
        ...paymentInfo,
        deliveryAddress: { fullAddress: address, lat: parseFloat(lat), lng: parseFloat(lng) },
      };

      const { data } = await API.post('/orders', orderData);
      clearCart();
      toast.success('Order placed successfully! 🎉');
      navigate(`/order/${data._id}`);
    } catch (err) {
      toast.error('Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRazorpay = async () => {
    if (!address || !lat || !lng) {
      toast.error('Please add a delivery address first');
      return;
    }
    try {
      setLoading(true);
      // Step 1: Create order on backend
      const { data } = await API.post('/payment/create-order', { amount: total });

      // Step 2: Open Razorpay popup
      const options = {
        key:      data.key,
        amount:   data.amount,
        currency: data.currency,
        name:     '🐦 HungryBirds',
        description: `Order from ${cart.restaurantName}`,
        order_id: data.orderId,
        prefill: {
          name:  user.name,
          email: user.email,
          contact: user.phone,
        },
        theme: { color: '#FF4500' },
        handler: async (response) => {
          // Step 3: Verify payment
          const verifyRes = await API.post('/payment/verify', {
            razorpay_order_id:   response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature:  response.razorpay_signature,
          });
          if (verifyRes.data.success) {
            await placeOrder({
              razorpayOrderId:   response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
            });
          } else {
            toast.error('Payment verification failed!');
          }
        },
        modal: {
          ondismiss: () => { setLoading(false); }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.error('Payment failed to initialize');
      setLoading(false);
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: 600 }}>
      <h1 className="section-title">💳 Payment</h1>

      {/* Order Summary */}
      <div style={{
        background: 'white', borderRadius: 16, padding: 20,
        boxShadow: '0 2px 12px rgba(0,0,0,0.07)', marginBottom: 24,
      }}>
        <h3 style={{ fontFamily: 'Syne', marginBottom: 16 }}>Order Summary</h3>
        {cart.items.map(item => (
          <div key={item._id} style={{
            display: 'flex', justifyContent: 'space-between',
            padding: '8px 0', borderBottom: '1px solid #F3F4F6',
            fontSize: '0.9rem', color: 'var(--gray)',
          }}>
            <span>{item.name} × {item.quantity}</span>
            <span>₹{item.price * item.quantity}</span>
          </div>
        ))}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          marginTop: 12, fontWeight: 700, fontSize: '1rem',
        }}>
          <span>Total</span>
          <span>₹{total}</span>
        </div>
      </div>

      {/* Delivery Address */}
      <div style={{
        background: 'white', borderRadius: 16, padding: 20,
        boxShadow: '0 2px 12px rgba(0,0,0,0.07)', marginBottom: 24,
      }}>
        <h3 style={{ fontFamily: 'Syne', marginBottom: 16 }}>📍 Delivery Address</h3>
        <div className="input-group">
          <label>Full Address</label>
          <textarea
            rows={3}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter your full delivery address..."
            style={{
              width: '100%', padding: '12px 16px', border: '1.5px solid #E5E7EB',
              borderRadius: 10, fontFamily: 'DM Sans', fontSize: '0.95rem', outline: 'none',
            }}
          />
        </div>
        <button className="btn btn-outline btn-sm" onClick={detectLocation}>
          📍 Detect My Location
        </button>
        {lat && lng && (
          <p style={{ color: 'var(--success)', fontSize: '0.85rem', marginTop: 8 }}>
            ✅ Location detected: {parseFloat(lat).toFixed(4)}, {parseFloat(lng).toFixed(4)}
          </p>
        )}
      </div>

      {/* Payment Method */}
      <div style={{
        background: 'white', borderRadius: 16, padding: 20,
        boxShadow: '0 2px 12px rgba(0,0,0,0.07)', marginBottom: 24,
      }}>
        <h3 style={{ fontFamily: 'Syne', marginBottom: 16 }}>Payment Method</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { id: 'razorpay', label: '💳 Online Payment (UPI / Card / Netbanking)', sub: 'Powered by Razorpay' },
            { id: 'cod',      label: '💵 Cash on Delivery', sub: 'Pay when your food arrives' },
          ].map(opt => (
            <label
              key={opt.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 16,
                padding: '14px 20px', borderRadius: 12, cursor: 'pointer',
                border: `2px solid ${method === opt.id ? 'var(--primary)' : '#E5E7EB'}`,
                background: method === opt.id ? 'var(--secondary)' : 'white',
              }}
            >
              <input
                type="radio" name="payment" value={opt.id}
                checked={method === opt.id}
                onChange={() => setMethod(opt.id)}
                style={{ accentColor: 'var(--primary)' }}
              />
              <div>
                <div style={{ fontWeight: 600 }}>{opt.label}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--gray)' }}>{opt.sub}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Pay Button */}
      <button
        className="btn btn-primary btn-full"
        style={{ padding: 18, fontSize: '1.05rem' }}
        disabled={loading}
        onClick={() => method === 'razorpay' ? handleRazorpay() : placeOrder()}
      >
        {loading ? '⏳ Processing...' : `Place Order · ₹${total}`}
      </button>
    </div>
  );
};

export default Payment;
