import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import API, { errorMessage } from '../api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useT } from '../i18n';
import AddressPicker from '../components/AddressPicker';
import { Card, EmptyState, VegMark } from '../components/ui';
import { formatSlot, rupees } from '../lib/format';
import { loadRazorpay } from '../lib/razorpay';

// Delivery slots every 30 min, from ~1 hour from now, 8 am – 10:30 pm, for the next 3 days.
const buildSlots = () => {
  const slots = [];
  const start = new Date(Date.now() + 60 * 60 * 1000);
  start.setMinutes(start.getMinutes() < 30 ? 30 : 60, 0, 0);
  for (let d = new Date(start); d.getTime() < Date.now() + 3 * 24 * 60 * 60 * 1000; d = new Date(d.getTime() + 30 * 60 * 1000)) {
    const h = Number(d.toLocaleString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false }));
    if (h >= 8 && h < 23) slots.push(d.toISOString());
  }
  return slots;
};

const Checkout = () => {
  const navigate = useNavigate();
  const { cart, lines, clearCart } = useCart();
  const { user } = useAuth();
  const { t, locale } = useT();

  const first = user?.addresses?.[0];
  const [address, setAddress] = useState(first ? { fullAddress: first.fullAddress, lat: first.lat, lng: first.lng } : null);
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState('');
  const [coupons, setCoupons] = useState([]);
  const [method, setMethod] = useState('cod');
  const [when, setWhen] = useState('now'); // 'now' | 'later'
  const [slot, setSlot] = useState('');
  const [razorpayEnabled, setRazorpayEnabled] = useState(false);
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState('');
  const [quoting, setQuoting] = useState(false);
  const [placing, setPlacing] = useState(false);

  const slots = useMemo(buildSlots, []);

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
    const timer = setTimeout(async () => {
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
        const msg = errorMessage(e, t('checkout.priceError'));
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
    return () => clearTimeout(timer);
  }, [cart.restaurantId, linesKey, coupon, address?.lat, address?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!cart.items.length) {
    return (
      <div className="page-container">
        <EmptyState emoji="🛒" title={t('cart.empty')} />
      </div>
    );
  }

  const done = (order) => {
    clearCart();
    toast.success(order.orderStatus === 'scheduled' ? t('checkout.scheduledToast') : t('checkout.placedToast'));
    navigate(`/order/${order._id}`, { replace: true });
  };

  const payOnline = async (order, payment) => {
    if (!(await loadRazorpay())) {
      toast.error(t('checkout.rzpLoadError'));
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
      description: order.restaurantName,
      prefill: { name: user.name, email: user.email || undefined, contact: user.phone },
      theme: { color: '#FF4500' },
      handler: async (response) => {
        try {
          const { data } = await API.post('/payment/verify', { orderId: order._id, ...response });
          done(data.order);
        } catch (e) {
          toast.error(errorMessage(e, t('checkout.verifyError')));
          navigate(`/order/${order._id}`); // the webhook may still confirm it
        }
      },
      modal: {
        ondismiss: async () => {
          await API.post(`/orders/${order._id}/cancel`, { reason: 'Payment cancelled' }).catch(() => {});
          toast(t('checkout.paymentCancelled'), { icon: 'ℹ️' });
          setPlacing(false);
        },
      },
    });
    rzp.on('payment.failed', (r) => toast.error(r.error?.description || t('pay.failed')));
    rzp.open();
  };

  const placeOrder = async () => {
    if (!address?.fullAddress || address.fullAddress.length < 5) {
      toast.error(t('checkout.chooseAddress'));
      return;
    }
    if (when === 'later' && !slot) {
      toast.error(t('checkout.chooseSlot'));
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
        ...(when === 'later' && { scheduledFor: slot }),
      });
      if (method === 'cod') return done(data.order);
      await payOnline(data.order, data.payment);
    } catch (e) {
      toast.error(errorMessage(e, t('checkout.placeError')));
      setPlacing(false);
    }
  };

  const slotsByDay = slots.reduce((acc, s) => {
    const day = new Date(s).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
    (acc[day] ||= []).push(s);
    return acc;
  }, {});

  return (
    <div className="page-container checkout">
      <h1 className="section-title">{t('checkout.title')}</h1>
      <div className="checkout-grid">
        <div>
          <Card title={`📍 ${t('checkout.address')}`}>
            <AddressPicker value={address} onChange={setAddress} />
          </Card>

          <Card title={`🕐 ${t('checkout.when')}`}>
            <div className="segmented-lg" role="radiogroup" aria-label={t('checkout.when')}>
              <button type="button" role="radio" aria-checked={when === 'now'} className={when === 'now' ? 'active' : ''} onClick={() => setWhen('now')}>
                ⚡ {t('checkout.now')}
              </button>
              <button type="button" role="radio" aria-checked={when === 'later'} className={when === 'later' ? 'active' : ''} onClick={() => setWhen('later')}>
                🗓️ {t('checkout.later')}
              </button>
            </div>
            {when === 'later' && (
              <label className="input-group" style={{ marginTop: 12 }}>
                <span className="small muted">{t('checkout.slotHint')}</span>
                <select value={slot} onChange={(e) => setSlot(e.target.value)} className="select-lg">
                  <option value="">{t('checkout.pickSlot')}</option>
                  {Object.entries(slotsByDay).map(([day, list]) => (
                    <optgroup key={day} label={day}>
                      {list.map((s) => (
                        <option key={s} value={s}>{new Date(s).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
            )}
          </Card>

          <Card title={`💳 ${t('checkout.payment')}`}>
            <div className="stack gap-12">
              {[
                { id: 'razorpay', label: t('checkout.online'), sub: razorpayEnabled ? t('checkout.onlineSub') : t('checkout.onlineOff'), disabled: !razorpayEnabled },
                { id: 'cod', label: t('checkout.cod'), sub: t('checkout.codSub') },
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
              <input value={couponInput} onChange={(e) => setCouponInput(e.target.value)} placeholder={t('checkout.coupon')} aria-label={t('checkout.coupon')} />
              <button type="submit" className="btn btn-outline btn-sm">{t('checkout.apply')}</button>
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
                <div className="bill-row"><span>{t('bill.itemTotal')}</span><span>{rupees(quote.subtotal)}</span></div>
                {quote.discount > 0 && (
                  <div className="bill-row success">
                    <span>
                      {t('bill.coupon', { code: quote.couponCode })}{' '}
                      <button type="button" className="link" onClick={() => { setCoupon(''); setCouponInput(''); }}>{t('checkout.remove')}</button>
                    </span>
                    <span>− {rupees(quote.discount)}</span>
                  </div>
                )}
                <div className="bill-row">
                  <span>{address ? t('bill.deliveryKm', { km: quote.distanceKm }) : t('bill.deliveryBase')}</span>
                  <span>{rupees(quote.deliveryFee)}</span>
                </div>
                <div className="bill-row"><span>{t('bill.gst', { pct: quote.taxPercent })}</span><span>{rupees(quote.tax)}</span></div>
                <div className="bill-row total"><span>{t('bill.toPay')}</span><span>{rupees(quote.finalAmount)}</span></div>
                {address && (
                  <p className="muted small">
                    {when === 'later' && slot ? `🗓️ ${t('checkout.arrivesAt', { time: formatSlot(slot, locale) })}` : `🕐 ${t('checkout.arrivesIn', { eta: quote.estimatedDelivery })}`}
                  </p>
                )}
              </div>
            )}
          </Card>

          <button type="button" className="btn btn-primary btn-full btn-lg" disabled={placing || !quote || !!quoteError || !address} onClick={placeOrder}>
            {placing
              ? `⏳ ${t('checkout.processing')}`
              : !address
                ? t('checkout.chooseAddress')
                : t(when === 'later' ? 'checkout.schedule' : 'checkout.place', { total: quote ? rupees(quote.finalAmount) : '…' })}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
