import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import API, { errorMessage } from '../api';
import { useAuth } from '../context/AuthContext';
import { CITIES, DEFAULT_CITY, getCurrentPosition, reverseGeocode, searchPlaces } from '../lib/geo';
import { LocationPicker } from './Maps';

/**
 * Choose a delivery address: saved addresses, GPS, or OpenStreetMap search,
 * then fine-tune the pin on the map. Calls onChange({ fullAddress, lat, lng }).
 */
const AddressPicker = ({ value, onChange }) => {
  const { user, setAddresses } = useAuth();
  const saved = user?.addresses || [];
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [locating, setLocating] = useState(false);
  const [saveLabel, setSaveLabel] = useState('Home');
  const abortRef = useRef();

  // Debounced search (Nominatim asks for ≤ 1 request/second).
  useEffect(() => {
    if (query.trim().length < 3) {
      setResults([]);
      return undefined;
    }
    const t = setTimeout(async () => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      try {
        setResults(await searchPlaces(query, abortRef.current.signal));
      } catch {
        /* aborted */
      }
    }, 700);
    return () => clearTimeout(t);
  }, [query]);

  const detect = async () => {
    setLocating(true);
    try {
      const point = await getCurrentPosition();
      const { fullAddress } = await reverseGeocode(point);
      onChange({ ...point, fullAddress });
    } catch (e) {
      toast.error(`${e.message}. Search for your area or tap the map instead.`);
      if (!value) onChange({ ...CITIES[DEFAULT_CITY], fullAddress: '' });
    } finally {
      setLocating(false);
    }
  };

  const movePin = async (point) => {
    onChange({ ...value, ...point });
    const { fullAddress } = await reverseGeocode(point);
    onChange({ ...point, fullAddress });
  };

  const saveAddress = async () => {
    try {
      const { data } = await API.post('/auth/addresses', { label: saveLabel, ...value });
      setAddresses(data);
      toast.success('Address saved');
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const removeAddress = async (id) => {
    try {
      const { data } = await API.delete(`/auth/addresses/${id}`);
      setAddresses(data);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const isSaved = value && saved.some((a) => Math.abs(a.lat - value.lat) < 1e-5 && Math.abs(a.lng - value.lng) < 1e-5);

  return (
    <div className="address-picker">
      {saved.length > 0 && (
        <div className="chip-row" style={{ marginBottom: 12 }}>
          {saved.map((a) => (
            <span key={a._id} className={`chip ${value?.lat === a.lat && value?.lng === a.lng ? 'chip-active' : ''}`}>
              <button type="button" className="chip-btn" onClick={() => onChange({ fullAddress: a.fullAddress, lat: a.lat, lng: a.lng })} title={a.fullAddress}>
                {a.label === 'Work' ? '💼' : a.label === 'Home' ? '🏠' : '📍'} {a.label}
              </button>
              <button type="button" className="chip-x" aria-label={`Remove ${a.label}`} onClick={() => removeAddress(a._id)}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="row gap-8 wrap" style={{ marginBottom: 12 }}>
        <button type="button" className="btn btn-outline btn-sm" onClick={detect} disabled={locating}>
          {locating ? '⏳ Locating…' : '📍 Use my location'}
        </button>
        {Object.keys(CITIES).map((city) => (
          <button key={city} type="button" className="btn btn-ghost btn-sm" onClick={() => movePin(CITIES[city])}>
            {city}
          </button>
        ))}
      </div>

      <div className="input-group" style={{ position: 'relative' }}>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search area, street or landmark…" aria-label="Search address" />
        {results.length > 0 && (
          <ul className="dropdown">
            {results.map((r) => (
              <li key={`${r.lat},${r.lng}`}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(r);
                    setQuery('');
                    setResults([]);
                  }}
                >
                  {r.fullAddress}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {value && (
        <>
          <LocationPicker value={value} onChange={movePin} />
          <p className="muted small" style={{ margin: '6px 0 12px' }}>Drag the pin or tap the map to the exact door.</p>
          <div className="input-group">
            <label htmlFor="fullAddress">Full address (flat / house no., street, landmark)</label>
            <textarea id="fullAddress" rows={2} value={value.fullAddress} onChange={(e) => onChange({ ...value, fullAddress: e.target.value })} />
          </div>
          {!isSaved && value.fullAddress?.length > 4 && (
            <div className="row gap-8">
              <select value={saveLabel} onChange={(e) => setSaveLabel(e.target.value)} aria-label="Address label" className="select-sm">
                <option>Home</option>
                <option>Work</option>
                <option>Other</option>
              </select>
              <button type="button" className="btn btn-ghost btn-sm" onClick={saveAddress}>
                💾 Save address
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AddressPicker;
