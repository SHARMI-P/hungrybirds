import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../api';

const Home = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [location, setLocation]       = useState(null);
  const [locationName, setLocationName] = useState('Detecting location...');
  const [search, setSearch]           = useState('');
  const [error, setError]             = useState('');

  // Step 1: Detect user's GPS location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setLocation({ lat: latitude, lng: longitude });
          reverseGeocode(latitude, longitude);
        },
        () => {
          // If user denies location, fall back to Chennai
          setLocation({ lat: 13.0827, lng: 80.2707 });
          setLocationName('Chennai, Tamil Nadu');
        }
      );
    } else {
      setLocation({ lat: 13.0827, lng: 80.2707 });
      setLocationName('Chennai, Tamil Nadu');
    }
  }, []);

  // Step 2: Convert lat/lng to address name using Google Maps API
  const reverseGeocode = async (lat, lng) => {
    try {
      const key = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${key}`
      );
      const data = await res.json();
      if (data.results[0]) {
        const parts = data.results[0].address_components;
        const locality = parts.find(p => p.types.includes('locality'))?.long_name;
        const area     = parts.find(p => p.types.includes('sublocality'))?.long_name;
        setLocationName(`${area || locality || 'Your Location'}`);
      }
    } catch {
      setLocationName('Your Location');
    }
  };

  // Step 3: Fetch nearby restaurants once location is known
  useEffect(() => {
    if (!location) return;
    fetchRestaurants();
  }, [location]);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const { data } = await API.get(
       `/restaurants/nearby?lat=${location.lat}&lng=${location.lng}&radius=50000`
      );
      setRestaurants(data);
    } catch (err) {
      setError('Could not load restaurants. Make sure the backend is running!');
    } finally {
      setLoading(false);
    }
  };

  const filtered = restaurants.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.cuisine?.some(c => c.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      {/* Hero Section */}
      <div className="hero">
        <h1>Hungry? 🐦 We Got You!</h1>
        <p>📍 {locationName} — Discover restaurants near you</p>
        <div className="hero-search">
          <input
            type="text"
            placeholder="Search restaurants, cuisines..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button>Search</button>
        </div>
      </div>

      <div className="page-container">
        {/* Category chips */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 28, flexWrap: 'wrap' }}>
          {['All', 'South Indian', 'North Indian', 'Chinese', 'Pizza', 'Biryani', 'Burgers', 'Desserts'].map(cat => (
            <button
              key={cat}
              onClick={() => setSearch(cat === 'All' ? '' : cat)}
              style={{
                padding: '8px 18px',
                borderRadius: 50,
                border: '1.5px solid #E5E7EB',
                background: search === cat ? 'var(--primary)' : 'white',
                color: search === cat ? 'white' : '#1A1A1A',
                fontWeight: 500,
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        <h2 className="section-title">
          {loading ? 'Finding restaurants near you...' : `${filtered.length} Restaurants Near You`}
        </h2>

        {/* Loading spinner */}
        {loading && (
          <div className="loader"><div className="spinner"></div></div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            background: '#FEE2E2', color: '#DC2626',
            padding: 20, borderRadius: 12, marginBottom: 24,
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && !error && (
          <div className="empty-state">
            <div className="emoji">🍽️</div>
            <h3>No restaurants found</h3>
            <p>Try a different search or expand your area</p>
          </div>
        )}

        {/* Restaurants Grid */}
        <div className="restaurants-grid">
          {filtered.map(restaurant => (
            <Link
              key={restaurant._id}
              to={`/restaurant/${restaurant._id}`}
              className="card restaurant-card"
            >
              <img
                src={restaurant.image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400'}
                alt={restaurant.name}
                onError={(e) => {
                  e.target.src = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400';
                }}
              />
              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3>{restaurant.name}</h3>
                  <span className="rating-badge">⭐ {restaurant.rating || '4.0'}</span>
                </div>
                <div className="meta">
                  <span>{restaurant.cuisine?.join(', ')}</span>
                </div>
                <div className="meta">
                  <span>🕐 {restaurant.deliveryTime || '30-45 mins'}</span>
                  <span>•</span>
                  <span>🚚 ₹{restaurant.deliveryFee || 30} delivery</span>
                  <span>•</span>
                  <span>Min ₹{restaurant.minimumOrder || 100}</span>
                </div>
                {restaurant.offers?.length > 0 && (
                  <span className="offer-tag">🏷️ {restaurant.offers[0]}</span>
                )}
                {!restaurant.isOpen && (
                  <span style={{
                    background: '#FEE2E2', color: '#DC2626',
                    fontSize: '0.78rem', fontWeight: 600,
                    padding: '4px 10px', borderRadius: 6, display: 'inline-block',
                  }}>
                    Currently Closed
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;
