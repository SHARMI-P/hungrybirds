import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api';
import { useCart } from '../context/CartContext';

const Restaurant = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem, removeItem, getItemQuantity, totalItems, subtotal } = useCart();

  const [restaurant, setRestaurant] = useState(null);
  const [menu, setMenu]             = useState({ items: [], grouped: {} });
  const [loading, setLoading]       = useState(true);
  const [activeCategory, setActiveCategory] = useState('');

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [restRes, menuRes] = await Promise.all([
        API.get(`/restaurants/${id}`),
        API.get(`/menu/${id}`),
      ]);
      setRestaurant(restRes.data);
      setMenu(menuRes.data);
      const cats = Object.keys(menuRes.data.grouped || {});
      if (cats.length > 0) setActiveCategory(cats[0]);
    } catch (err) {
      alert('Failed to load restaurant details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="loader"><div className="spinner"></div></div>
  );

  if (!restaurant) return (
    <div className="empty-state">
      <div className="emoji">😕</div>
      <h3>Restaurant not found</h3>
    </div>
  );

  const categories = Object.keys(menu.grouped);

  return (
    <div>
      {/* Restaurant Banner */}
      <div style={{ position: 'relative', height: 280, overflow: 'hidden' }}>
        <img
          src={restaurant.image || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200'}
          alt={restaurant.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200';
          }}
        />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%)',
        }}/>
        <button
          onClick={() => navigate(-1)}
          style={{
            position: 'absolute', top: 20, left: 20,
            background: 'white', border: 'none', borderRadius: '50%',
            width: 40, height: 40, cursor: 'pointer', fontSize: '1.1rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >←</button>
        <div style={{ position: 'absolute', bottom: 24, left: 24, color: 'white' }}>
          <h1 style={{ fontFamily: 'Syne', fontSize: '2rem', marginBottom: 8 }}>
            {restaurant.name}
          </h1>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', opacity: 0.9, fontSize: '0.9rem' }}>
            <span>⭐ {restaurant.rating} ({restaurant.totalRatings} ratings)</span>
            <span>🕐 {restaurant.deliveryTime}</span>
            <span>🚚 ₹{restaurant.deliveryFee} delivery</span>
          </div>
        </div>
      </div>

      {/* Offers Strip */}
      {restaurant.offers?.length > 0 && (
        <div style={{
          background: '#FFF3EE', padding: '12px 24px',
          display: 'flex', gap: 20, overflowX: 'auto',
        }}>
          {restaurant.offers.map((offer, i) => (
            <span key={i} style={{
              background: 'white', padding: '6px 16px', borderRadius: 8,
              color: 'var(--primary)', fontWeight: 600, fontSize: '0.85rem',
              whiteSpace: 'nowrap', border: '1px dashed var(--primary)',
            }}>
              🏷️ {offer}
            </span>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', maxWidth: 1200, margin: '0 auto' }}>
        {/* Category Sidebar */}
        <div style={{
          width: 160, flexShrink: 0, padding: '24px 0',
          borderRight: '1px solid #F3F4F6', position: 'sticky',
          top: 72, height: 'calc(100vh - 72px)', overflowY: 'auto',
        }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '12px 20px', border: 'none', cursor: 'pointer',
                background: activeCategory === cat ? 'var(--secondary)' : 'transparent',
                color: activeCategory === cat ? 'var(--primary)' : '#6B7280',
                fontWeight: activeCategory === cat ? 700 : 400,
                borderLeft: activeCategory === cat ? '3px solid var(--primary)' : '3px solid transparent',
                fontFamily: 'DM Sans',
                fontSize: '0.9rem',
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Menu Items */}
        <div style={{ flex: 1 }}>
          {categories.map(cat => (
            <div key={cat} id={`cat-${cat}`}>
              <h2 style={{
                padding: '20px 24px 12px',
                fontFamily: 'Syne', fontSize: '1.3rem',
                borderBottom: '1px solid #F3F4F6',
              }}>
                {cat} ({menu.grouped[cat].length})
              </h2>
              {menu.grouped[cat].map(item => {
                const qty = getItemQuantity(item._id);
                return (
                  <div key={item._id} className="menu-item">
                    <div className="menu-item-info" style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span className={item.isVeg ? 'veg-icon' : 'nonveg-icon'}>
                          {item.isVeg ? '🟢' : '🔴'}
                        </span>
                        {item.isBestseller && <span className="bestseller-tag">⭐ Bestseller</span>}
                      </div>
                      <h4>{item.name}</h4>
                      <p>{item.description}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                        <span className="price">₹{item.price}</span>
                        {item.offer && (
                          <span style={{
                            background: '#FFF3EE', color: 'var(--primary)',
                            fontSize: '0.75rem', fontWeight: 600,
                            padding: '2px 8px', borderRadius: 4,
                          }}>
                            {item.offer}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <img
                        src={item.image || 'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=200'}
                        alt={item.name}
                        style={{ width: 100, height: 85, objectFit: 'cover', borderRadius: 12 }}
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=200';
                        }}
                      />
                      {qty === 0 ? (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => addItem(item, restaurant._id, restaurant.name)}
                        >
                          + ADD
                        </button>
                      ) : (
                        <div className="counter">
                          <button className="counter-btn" onClick={() => removeItem(item._id)}>−</button>
                          <span className="counter-num">{qty}</span>
                          <button className="counter-btn" onClick={() => addItem(item, restaurant._id, restaurant.name)}>+</button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {categories.length === 0 && (
            <div className="empty-state">
              <div className="emoji">🍽️</div>
              <h3>No menu items yet</h3>
              <p>Check back later</p>
            </div>
          )}
        </div>
      </div>

      {/* Floating Cart Bar */}
      {totalItems > 0 && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--primary)', color: 'white',
          padding: '16px 32px', borderRadius: 50,
          display: 'flex', alignItems: 'center', gap: 24,
          boxShadow: '0 8px 32px rgba(255,69,0,0.4)',
          cursor: 'pointer', zIndex: 200, minWidth: 300,
          justifyContent: 'space-between',
        }}
          onClick={() => navigate('/cart')}
        >
          <span style={{ fontWeight: 700 }}>{totalItems} items | ₹{subtotal}</span>
          <span style={{ fontWeight: 700 }}>View Cart →</span>
        </div>
      )}
    </div>
  );
};

export default Restaurant;
