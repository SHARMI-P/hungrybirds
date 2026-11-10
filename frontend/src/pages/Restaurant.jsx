import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import API, { errorMessage } from '../api';
import { useCart } from '../context/CartContext';
import { EmptyState, Loader, Stars, VegMark } from '../components/ui';
import { FALLBACK_FOOD, FALLBACK_RESTAURANT, formatDateTime, rupees } from '../lib/format';

const Restaurant = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem, removeItem, getItemQuantity, totalItems, subtotal, cart } = useCart();

  const [restaurant, setRestaurant] = useState(null);
  const [items, setItems] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [vegOnly, setVegOnly] = useState(false);
  const [activeCategory, setActiveCategory] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      API.get(`/restaurants/${id}`),
      API.get(`/menu/${id}`, { params: { all: true } }),
      API.get(`/restaurants/${id}/reviews`).catch(() => ({ data: [] })),
      API.get('/coupons', { params: { restaurantId: id } }).catch(() => ({ data: [] })),
    ])
      .then(([r, m, rv, c]) => {
        if (cancelled) return;
        setRestaurant(r.data);
        setItems(m.data.items);
        setReviews(rv.data);
        setCoupons(c.data);
      })
      .catch((e) => !cancelled && setError(errorMessage(e, 'Failed to load restaurant')))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id]);

  const grouped = useMemo(() => {
    const g = {};
    items.filter((i) => !vegOnly || i.isVeg).forEach((i) => (g[i.category] ||= []).push(i));
    return g;
  }, [items, vegOnly]);
  const categories = Object.keys(grouped);

  const scrollTo = (cat) => {
    setActiveCategory(cat);
    document.getElementById(`cat-${cat}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (loading) return <Loader />;
  if (error || !restaurant) return <EmptyState emoji="😕" title={error || 'Restaurant not found'} />;

  const cartIsHere = cart.restaurantId === restaurant._id;

  return (
    <div>
      <div className="banner">
        <img src={restaurant.image || FALLBACK_RESTAURANT} alt="" onError={(e) => { e.currentTarget.src = FALLBACK_RESTAURANT; }} />
        <div className="banner-shade" />
        <button type="button" className="back-btn" onClick={() => navigate(-1)} aria-label="Go back">←</button>
        <div className="banner-text">
          <h1>{restaurant.name}</h1>
          <div className="row gap-16 wrap small">
            <span>⭐ {restaurant.totalRatings ? `${restaurant.rating.toFixed(1)} (${restaurant.totalRatings} ratings)` : 'New'}</span>
            <span>🕐 {restaurant.deliveryTime}</span>
            <span>🚚 from {rupees(restaurant.deliveryFee)}</span>
            <span>Min {rupees(restaurant.minimumOrder)}</span>
            {restaurant.pureVeg && <span className="veg-pill">Pure veg</span>}
          </div>
          <div className="small" style={{ opacity: 0.85, marginTop: 4 }}>{restaurant.address}</div>
        </div>
      </div>

      {!restaurant.isOpen && <div className="alert alert-error" style={{ borderRadius: 0 }}>This restaurant is closed right now — you can browse the menu, but ordering is paused.</div>}

      {(restaurant.offers?.length > 0 || coupons.length > 0) && (
        <div className="offers-strip">
          {coupons.map((c) => (
            <span key={c.code} className="offer-chip" title={c.description}>🎟️ <b>{c.code}</b> · {c.description}</span>
          ))}
          {restaurant.offers.map((o) => (
            <span key={o} className="offer-chip">🏷️ {o}</span>
          ))}
        </div>
      )}

      <div className="menu-layout">
        <aside className="menu-sidebar" aria-label="Menu categories">
          <label className="toggle" style={{ padding: '0 20px 12px' }}>
            <input type="checkbox" checked={vegOnly} onChange={(e) => setVegOnly(e.target.checked)} /> Veg only
          </label>
          {categories.map((cat) => (
            <button type="button" key={cat} className={`cat-btn ${activeCategory === cat ? 'active' : ''}`} onClick={() => scrollTo(cat)}>
              {cat}
            </button>
          ))}
        </aside>

        <div className="menu-main">
          {categories.map((cat) => (
            <section key={cat} id={`cat-${cat}`} className="menu-section">
              <h2>{cat} ({grouped[cat].length})</h2>
              {grouped[cat].map((item) => {
                const qty = getItemQuantity(item._id);
                const canAdd = item.isAvailable && restaurant.isOpen;
                return (
                  <div key={item._id} className={`menu-item ${item.isAvailable ? '' : 'sold-out'}`}>
                    <div className="menu-item-info">
                      <div className="row gap-8" style={{ marginBottom: 4 }}>
                        <VegMark veg={item.isVeg} />
                        {item.isBestseller && <span className="bestseller-tag">⭐ Bestseller</span>}
                        {!item.isAvailable && <span className="soldout-tag">Sold out</span>}
                      </div>
                      <h4>{item.name}</h4>
                      <p>{item.description}</p>
                      <div className="row gap-12">
                        <span className="price">{rupees(item.price)}</span>
                        {item.offer && <span className="offer-mini">{item.offer}</span>}
                      </div>
                    </div>
                    <div className="menu-item-side">
                      <img src={item.image || FALLBACK_FOOD} alt="" loading="lazy" onError={(e) => { e.currentTarget.src = FALLBACK_FOOD; }} />
                      {!canAdd ? (
                        <button type="button" className="btn btn-sm" disabled>Unavailable</button>
                      ) : qty === 0 ? (
                        <button type="button" className="btn btn-primary btn-sm" onClick={() => addItem(item, restaurant._id, restaurant.name)}>+ ADD</button>
                      ) : (
                        <div className="counter">
                          <button type="button" className="counter-btn" onClick={() => removeItem(item._id)} aria-label={`Remove one ${item.name}`}>−</button>
                          <span className="counter-num" aria-live="polite">{qty}</span>
                          <button type="button" className="counter-btn" onClick={() => addItem(item, restaurant._id, restaurant.name)} aria-label={`Add one ${item.name}`}>+</button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </section>
          ))}

          {categories.length === 0 && <EmptyState emoji="🍽️" title={vegOnly ? 'No veg items here' : 'No menu items yet'} />}

          <section className="menu-section">
            <h2>Reviews</h2>
            {reviews.length === 0 ? (
              <p className="muted" style={{ padding: '12px 24px' }}>No reviews yet — order and be the first!</p>
            ) : (
              reviews.map((r) => (
                <div key={r._id} className="review">
                  <div className="row between">
                    <b>{r.userName}</b>
                    <Stars value={r.rating} size="1rem" />
                  </div>
                  {r.comment && <p>{r.comment}</p>}
                  <span className="muted small">{formatDateTime(r.createdAt)}</span>
                </div>
              ))
            )}
          </section>
        </div>
      </div>

      {totalItems > 0 && cartIsHere && (
        <button type="button" className="cart-bar" onClick={() => navigate('/cart')}>
          <span>{totalItems} item{totalItems > 1 ? 's' : ''} | {rupees(subtotal)}</span>
          <span>View Cart →</span>
        </button>
      )}
    </div>
  );
};

export default Restaurant;
