import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import API, { errorMessage } from '../api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import AddressPicker from '../components/AddressPicker';
import { Card, EmptyState, VegMark } from '../components/ui';
import { rupees } from '../lib/format';
import { loadRazorpay } from '../lib/razorpay';

const Checkout = () => {
  const navigate = useNavigate();
  const { cart, lines, clearCart } = useCart();
  const { user } = useAuth();

  const first = user?.addresses?.[0];
  const [address, setAddress] = useState(first ? { fullAddress: first.fullAddress, lat: first.lat, lng: first.lng } : null);
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState('');
  const [coupons, setCoupons] = useState([]);
  const [method, setMethod] = useState('cod');
  const [razorpayEnabled, setRazorpayEnabled] = useState(false);
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState('');
  const [quoting, setQuoting] = useState(false);
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    API.get('/payment/config')
      .then(({ data }) => {
        setRazorpayEnabled(data.razorpayEnabled);
        if (data.razorpayEnabled) setMethod('razorpay');
      })
      .catch(() => {});
    if (cart.restaurantId) API.get('/coupons', { params: { restaurantId: cart.restaurantId } }).then(({ data }) => setCoupons(data)).catch(() => {});
  }, [cart.restaurantId]);

  // Live bill from the server whenever the cart, address or coupon changes.
  const linesKey = JSON.stringify(lines);
  useEffect(() => {
    if (!cart.restaurantId || !lines.length) return undefined;
    const t = setTimeout(async () => {
      setQuoting(true);
      try {
        const { data } = await API.post('/orders/quote', {
          restaurantId: cart.restaurantId,
          items: lines,
          couponCode: coupon || undefined,
          deliveryLocation: address ? { lat: address.lat, lng: address.lng } : undefined,
        });
        setQuote(data);
        setQuoteError('');
      } catch (e) {
        const msg = errorMessage(e, 'Could not price your cart');
        if (coupon && /coupon|first order|more to use/i.test(msg)) {
          toast.error(msg);
          setCoupon('');
        } else {
          setQuote(null);
          setQuoteError(msg);
        }
      } finally {
        setQuoting(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [cart.restaurantId, linesKey, coupon, address?.lat, address?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!cart.items.length) {
    return (
      <div className="page-container">
        <EmptyState emoji="🛒" title="Your cart is empty" />
      </div>
    );
  }

  const done = (order) => {
    clearCart();
    toast.success('Order placed! 🎉');
    navigate(`/order/${order._id}`, { replace: true });
  };

  const payOnline = async (order, payment) => {
    if (!(await loadRazorpay())) {
      toast.error('Could not load the payment window. Check your connection or choose Cash on Delivery.');
      await API.post(`/orders/${order._id}/cancel`, { reason: 'Payment window failed to load' }).catch(() => {});
      setPlacing(false);
      return;
    }
    const rzp = new window.Razorpay({
      key: payment.key,
      amount: payment.amount,
      currency: payment.currency,
      order_id: payment.orderId,
      name: 'HungryBirds',
      description: `Order from ${order.restaurantName}`,
      prefill: { name: user.name, email: user.email, contact: user.phone },
      theme: { color: '#FF4500' },
      handler: async (response) => {
        try {
          const { data } = await API.post('/payment/verify', { orderId: order._id, ...response });
          done(data.order);
        } catch (e) {
          toast.error(errorMessage(e, 'Payment verification failed'));
          // The webhook may still confirm it — send the user to the order page either way.
          navigate(`/order/${order._id}`);
        }
      },
      modal: {
        ondismiss: async () => {
          await API.post(`/orders/${order._id}/cancel`, { reason: 'Payment cancelled' }).catch(() => {});
          toast('Payment cancelled — nothing was charged.', { icon: 'ℹ️' });
          setPlacing(false);
        },
      },
    });
    rzp.on('payment.failed', (r) => toast.error(r.error?.description || 'Payment failed'));
    rzp.open();
  };

  const placeOrder = async () => {
    if (!address?.fullAddress || address.fullAddress.length < 5) {
      toast.error('Please choose a delivery address');
      return;
    }
    setPlacing(true);
    try {
      const { data } = await API.post('/orders', {
        restaurantId: cart.restaurantId,
        items: lines,
        couponCode: coupon || undefined,
        paymentMethod: method,
        deliveryAddress: address,
      });
      if (method === 'cod') return done(data.order);
      await payOnline(data.order, data.payment);
    } catch (e) {
      toast.error(errorMessage(e, 'Failed to place order'));
      setPlacing(false);
    }
  };

  return (
    <div className="page-container checkout">
      <h1 className="section-title">Checkout</h1>
      <div className="checkout-grid">
        <div>
          <Card title="📍 Delivery address">
            <AddressPicker value={address} onChange={setAddress} />
          </Card>

          <Card title="💳 Payment method">
            <div className="stack gap-12">
              {[
                { id: 'razorpay', label: 'Online payment (UPI / Card / Netbanking)', sub: razorpayEnabled ? 'Secured by Razorpay' : 'Not available right now', disabled: !razorpayEnabled },
                { id: 'cod', label: 'Cash on Delivery', sub: 'Pay when your food arrives' },
              ].map((opt) => (
                <label key={opt.id} className={`pay-option ${method === opt.id ? 'selected' : ''} ${opt.disabled ? 'disabled' : ''}`}>
                  <input type="radio" name="payment" value={opt.id} checked={method === opt.id} disabled={opt.disabled} onChange={() => setMethod(opt.id)} />
                  <div>
                    <div className="bold">{opt.id === 'cod' ? '💵' : '💳'} {opt.label}</div>
                    <div className="muted small">{opt.sub}</div>
                  </div>
                </label>
              ))}
            </div>
          </Card>
        </div>

        <div className="checkout-summary">
          <Card title={`🧾 ${cart.restaurantName}`}>
            {cart.items.map((i) => (
              <div key={i._id} className="bill-row">
                <span className="row gap-8"><VegMark veg={i.isVeg} /> {i.name} × {i.quantity}</span>
                <span>{rupees((quote?.items.find((q) => q.menuItemId === i._id)?.price ?? i.price) * i.quantity)}</span>
              </div>
            ))}

            <form
              className="coupon-row"
              onSubmit={(e) => {
                e.preventDefault();
                if (couponInput.trim()) setCoupon(couponInput.trim().toUpperCase());
              }}
            >
              <input value={couponInput} onChange={(e) => setCouponInput(e.target.value)} placeholder="Coupon code" aria-label="Coupon code" />
              <button type="submit" className="btn btn-outline btn-sm">Apply</button>
            </form>
            {coupons.length > 0 && !coupon && (
              <div className="chip-row" style={{ marginBottom: 8 }}>
                {coupons.map((c) => (
                  <button type="button" key={c.code} className="chip" title={c.description} onClick={() => { setCouponInput(c.code); setCoupon(c.code); }}>
                    🎟️ {c.code}
                  </button>
                ))}
              </div>
            )}

            {quoteError && <div className="alert alert-error small">{quoteError}</div>}

            {quote && (
              <div className={`bill ${quoting ? 'dim' : ''}`}>
                <div className="bill-row"><span>Item total</span><span>{rupees(quote.subtotal)}</span></div>
                {quote.discount > 0 && (
                  <div className="bill-row success">
                    <span>
                      Coupon {quote.couponCode}{' '}
                      <button type="button" className="link" onClick={() => { setCoupon(''); setCouponInput(''); }}>remove</button>
                    </span>
                    <span>− {rupees(quote.discount)}</span>
                  </div>
                )}
                <div className="bill-row">
                  <span>Delivery fee {address ? `(${quote.distanceKm} km)` : '(base)'}</span>
                  <span>{rupees(quote.deliveryFee)}</span>
                </div>
                <div className="bill-row"><span>GST ({quote.taxPercent}%)</span><span>{rupees(quote.tax)}</span></div>
                <div className="bill-row total"><span>To pay</span><span>{rupees(quote.finalAmount)}</span></div>
                {address && <p className="muted small">🕐 Arrives in about {quote.estimatedDelivery}</p>}
              </div>
            )}
          </Card>

          <button type="button" className="btn btn-primary btn-full btn-lg" disabled={placing || !quote || !!quoteError || !address} onClick={placeOrder}>
            {placing ? '⏳ Processing…' : !address ? 'Choose an address' : `Place order · ${quote ? rupees(quote.finalAmount) : '…'}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
