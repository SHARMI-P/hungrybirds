// Location helpers built on open data: the browser Geolocation API and
// OpenStreetMap's Nominatim geocoder (no API key, no billing).
const NOMINATIM = 'https://nominatim.openstreetmap.org';

export const CITIES = {
  Dharwad: { lat: 15.4589, lng: 75.0078 },
  Hubli: { lat: 15.3647, lng: 75.124 },
};
export const DEFAULT_CITY = 'Dharwad';

export const getCurrentPosition = (options = {}) =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Geolocation is not supported by this browser'));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(new Error(err.code === 1 ? 'Location permission denied' : 'Could not get your location')),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000, ...options },
    );
  });

export const reverseGeocode = async ({ lat, lng }) => {
  try {
    const res = await fetch(`${NOMINATIM}/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
      headers: { 'Accept-Language': 'en' },
    });
    if (!res.ok) throw new Error();
    const data = await res.json();
    const a = data.address || {};
    return {
      fullAddress: data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      area: a.suburb || a.neighbourhood || a.city_district || a.village || a.town || a.city || 'Your location',
      city: a.city || a.town || a.county || '',
    };
  } catch {
    return { fullAddress: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, area: 'Your location', city: '' };
  }
};

// Forward search, biased to the Dharwad–Hubli area.
export const searchPlaces = async (query, signal) => {
  const viewbox = '74.90,15.55,75.25,15.28'; // left,top,right,bottom
  const res = await fetch(
    `${NOMINATIM}/search?format=jsonv2&limit=5&countrycodes=in&viewbox=${viewbox}&q=${encodeURIComponent(query)}`,
    { headers: { 'Accept-Language': 'en' }, signal },
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.map((p) => ({ fullAddress: p.display_name, lat: Number(p.lat), lng: Number(p.lon) }));
};

export const haversineKm = (a, b) => {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
};

export const pointToLatLng = (point) => (point?.coordinates ? { lat: point.coordinates[1], lng: point.coordinates[0] } : null);
