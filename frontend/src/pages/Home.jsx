import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import API, { errorMessage } from '../api';
import { EmptyState, Loader } from '../components/ui';
import { CITIES, DEFAULT_CITY, getCurrentPosition, reverseGeocode } from '../lib/geo';
import { FALLBACK_RESTAURANT, rupees } from '../lib/format';

const LOCATION_KEY = 'hungrybirds_location';

const savedLocation = () => {
  try {
    return JSON.parse(sessionStorage.getItem(LOCATION_KEY) || 'null');
  } catch {
    return null;
  }
};

const Home = () => {
  const [location, setLocation] = useState(savedLocation);
  const [locationName, setLocationName] = useState(savedLocation()?.name || 'Detecting location…');
  const [restaurants, setRestaurants] = useState([]);
  const [cuisines, setCuisines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [query, setQuery] = useState(''); // debounced
  const [cuisine, setCuisine] = useState('');
  const [veg, setVeg] = useState(false);
  const [sort, setSort] = useState('distance');

  const chooseLocation = (point, name) => {
    setLocation(point);
    setLocationName(name);
    sessionStorage.setItem(LOCATION_KEY, JSON.stringify({ ...point, name }));
  };

  // 1. Where is the user? GPS → reverse geocode (OpenStreetMap), else default to Dharwad.
  useEffect(() => {
    if (location) return;
    getCurrentPosition()
      .then(async (point) => chooseLocation(point, (await reverseGeocode(point)).area))
      .catch(() => chooseLocation(CITIES[DEFAULT_CITY], DEFAULT_CITY));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    API.get('/restaurants/cuisines').then(({ data }) => setCuisines(data.slice(0, 12))).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  // 2. Ask the server (geo query + filters run in MongoDB).
  useEffect(() => {
    if (!location) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    API.get('/restaurants/nearby', {
      params: { lat: location.lat, lng: location.lng, radius: 15000, q: query || undefined, cuisine: cuisine || undefined, veg: veg || undefined, sort },
    })
      .then(({ data }) => !cancelled && setRestaurants(data))
      .catch((e) => !cancelled && setError(errorMessage(e, 'Could not load restaurants')))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [location, query, cuisine, veg, sort]);

  return (
    <div>
      <section className="hero">
        <h1>Hungry? 🐦 We Got You!</h1>
        <p>
          📍 {locationName} ·{' '}
          {Object.keys(CITIES).map((c, i) => (
            <span key={c}>
              {i > 0 && ' / '}
              <button type="button" className="link-light" onClick={() => chooseLocation(CITIES[c], c)}>
                {c}
              </button>
            </span>
          ))}
        </p>
        <form className="hero-search" role="search" onSubmit={(e) => { e.preventDefault(); setQuery(search.trim()); }}>
          <input type="search" placeholder="Search restaurants or cuisines…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search restaurants" />
          <button type="submit">Search</button>
        </form>
      </section>

      <div className="page-container">
        <div className="filters">
          <div className="chip-row" role="group" aria-label="Cuisine">
            <button type="button" className={`chip ${!cuisine ? 'chip-active' : ''}`} onClick={() => setCuisine('')}>All</button>
            {cuisines.map((c) => (
              <button type="button" key={c} className={`chip ${cuisine === c ? 'chip-active' : ''}`} onClick={() => setCuisine(cuisine === c ? '' : c)}>
                {c}
              </button>
            ))}
          </div>
          <div className="row gap-12 wrap">
            <label className="toggle">
              <input type="checkbox" checked={veg} onChange={(e) => setVeg(e.target.checked)} />
              <span className="veg-mark veg" /> Pure veg
            </label>
            <label className="row gap-8 small">
              Sort
              <select value={sort} onChange={(e) => setSort(e.target.value)} className="select-sm">
                <option value="distance">Nearest</option>
                <option value="rating">Top rated</option>
                <option value="deliveryFee">Lowest delivery fee</option>
              </select>
            </label>
          </div>
        </div>

        <h2 className="section-title">{loading ? 'Finding restaurants near you…' : `${restaurants.length} restaurants near you`}</h2>

        {loading && <Loader />}
        {error && <div className="alert alert-error">⚠️ {error}</div>}

        {!loading && !error && restaurants.length === 0 && (
          <EmptyState emoji="🍽️" title="No restaurants found">
            <p>We deliver in Dharwad and Hubli — try another filter or switch city above.</p>
          </EmptyState>
        )}

        {!loading && (
          <div className="restaurants-grid">
            {restaurants.map((r) => (
              <Link key={r._id} to={`/restaurant/${r._id}`} className="card restaurant-card">
                <img src={r.image || FALLBACK_RESTAURANT} alt="" loading="lazy" onError={(e) => { e.currentTarget.src = FALLBACK_RESTAURANT; }} />
                <div className="card-body">
                  <div className="row between start">
                    <h3>{r.name}</h3>
                    <span className="rating-badge">⭐ {r.totalRatings ? r.rating.toFixed(1) : 'New'}</span>
                  </div>
                  <div className="meta">
                    {r.pureVeg && <span className="veg-pill">Pure veg</span>}
                    <span>{r.cuisine?.join(', ')}</span>
                  </div>
                  <div className="meta">
                    <span>📍 {r.distanceKm} km</span>
                    <span>•</span>
                    <span>🕐 {r.deliveryTime}</span>
                    <span>•</span>
                    <span>🚚 from {rupees(r.deliveryFee)}</span>
                  </div>
                  <div className="meta small">Min order {rupees(r.minimumOrder)}</div>
                  {r.offers?.length > 0 && <span className="offer-tag">🏷️ {r.offers[0]}</span>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
