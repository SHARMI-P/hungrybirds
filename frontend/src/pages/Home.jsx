import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import API, { errorMessage } from '../api';
import { useAuth } from '../context/AuthContext';
import { useT } from '../i18n';
import { EmptyState, FavButton, Loader } from '../components/ui';
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
  const { t } = useT();
  const { user, isFavorite } = useAuth();
  const [location, setLocation] = useState(savedLocation);
  const [locationName, setLocationName] = useState(savedLocation()?.name || '');
  const [restaurants, setRestaurants] = useState([]);
  const [cuisines, setCuisines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [query, setQuery] = useState(''); // debounced
  const [cuisine, setCuisine] = useState('');
  const [veg, setVeg] = useState(false);
  const [favOnly, setFavOnly] = useState(false);
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
      .then(async (point) => chooseLocation(point, (await reverseGeocode(point)).area || t('home.yourLocation')))
      .catch(() => chooseLocation(CITIES[DEFAULT_CITY], DEFAULT_CITY));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    API.get('/restaurants/cuisines').then(({ data }) => setCuisines(data.slice(0, 14))).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  // 2. Ask the server (geo query + filters run in MongoDB).
  useEffect(() => {
    if (!location) return undefined;
    let cancelled = false;
    setLoading(true);
    setError('');
    API.get('/restaurants/nearby', {
      params: { lat: location.lat, lng: location.lng, radius: 15000, q: query || undefined, cuisine: cuisine || undefined, veg: veg || undefined, sort },
    })
      .then(({ data }) => !cancelled && setRestaurants(data))
      .catch((e) => !cancelled && setError(errorMessage(e, t('home.loadError'))))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [location, query, cuisine, veg, sort]); // eslint-disable-line react-hooks/exhaustive-deps

  const shown = favOnly ? restaurants.filter((r) => isFavorite(r._id)) : restaurants;

  return (
    <div>
      <section className="hero">
        <h1>{t('home.title')}</h1>
        <p>
          📍 {locationName || t('home.detecting')} ·{' '}
          {Object.keys(CITIES).map((c, i) => (
            <span key={c}>
              {i > 0 && ' / '}
              <button type="button" className="link-light" onClick={() => chooseLocation(CITIES[c], t(`city.${c}`))}>
                {t(`city.${c}`)}
              </button>
            </span>
          ))}
        </p>
        <form className="hero-search" role="search" onSubmit={(e) => { e.preventDefault(); setQuery(search.trim()); }}>
          <input type="search" placeholder={t('home.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} aria-label={t('home.searchPlaceholder')} />
          <button type="submit">{t('home.search')}</button>
        </form>
      </section>

      <div className="page-container">
        <div className="filters">
          <div className="chip-row" role="group" aria-label={t('home.cuisine')}>
            <button type="button" className={`chip ${!cuisine ? 'chip-active' : ''}`} onClick={() => setCuisine('')}>{t('home.all')}</button>
            {cuisines.map((c) => (
              <button type="button" key={c} className={`chip ${cuisine === c ? 'chip-active' : ''}`} onClick={() => setCuisine(cuisine === c ? '' : c)}>
                {c}
              </button>
            ))}
          </div>
          <div className="row gap-12 wrap">
            <label className="toggle">
              <input type="checkbox" checked={veg} onChange={(e) => setVeg(e.target.checked)} />
              <span className="veg-mark veg" /> {t('home.pureVeg')}
            </label>
            {user && (
              <label className="toggle">
                <input type="checkbox" checked={favOnly} onChange={(e) => setFavOnly(e.target.checked)} />
                ❤️ {t('home.favourites')}
              </label>
            )}
            <label className="row gap-8 small">
              {t('home.sort')}
              <select value={sort} onChange={(e) => setSort(e.target.value)} className="select-sm">
                <option value="distance">{t('home.sort.distance')}</option>
                <option value="rating">{t('home.sort.rating')}</option>
                <option value="deliveryFee">{t('home.sort.fee')}</option>
              </select>
            </label>
          </div>
        </div>

        <h2 className="section-title">{loading ? t('home.finding') : t('home.count', { count: shown.length })}</h2>

        {loading && <Loader />}
        {error && <div className="alert alert-error">⚠️ {error}</div>}

        {!loading && !error && shown.length === 0 && (
          <EmptyState emoji={favOnly ? '❤️' : '🍽️'} title={favOnly ? t('home.noFavs') : t('home.none')}>
            <p>{favOnly ? t('home.noFavsHint') : t('home.noneHint')}</p>
          </EmptyState>
        )}

        {!loading && (
          <div className="restaurants-grid">
            {shown.map((r) => (
              <div key={r._id} className="card restaurant-card">
                <FavButton restaurantId={r._id} className="fav-on-card" />
                <Link to={`/restaurant/${r._id}`} className="card-link">
                  <img src={r.image || FALLBACK_RESTAURANT} alt="" loading="lazy" onError={(e) => { e.currentTarget.src = FALLBACK_RESTAURANT; }} />
                  <div className="card-body">
                    <div className="row between start">
                      <h3>{r.name}</h3>
                      <span className="rating-badge">⭐ {r.totalRatings ? r.rating.toFixed(1) : t('common.new')}</span>
                    </div>
                    <div className="meta">
                      {r.pureVeg && <span className="veg-pill">{t('home.pureVeg')}</span>}
                      <span>{r.cuisine?.join(', ')}</span>
                    </div>
                    <div className="meta">
                      <span>📍 {r.distanceKm} {t('common.km')}</span>
                      <span>•</span>
                      <span>🕐 {r.deliveryTime}</span>
                      <span>•</span>
                      <span>🚚 {t('home.feeFrom', { fee: rupees(r.deliveryFee) })}</span>
                    </div>
                    <div className="meta small">{t('home.minOrder', { amount: rupees(r.minimumOrder) })}</div>
                    {r.offers?.length > 0 && <span className="offer-tag">🏷️ {r.offers[0]}</span>}
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
