// OpenStreetMap + Leaflet maps (open-source, no API key).
import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const emojiIcon = (emoji, className = '') =>
  L.divIcon({
    html: `<div class="map-pin ${className}">${emoji}</div>`,
    className: 'map-pin-wrap',
    iconSize: [40, 40],
    iconAnchor: [20, 38],
    popupAnchor: [0, -34],
  });

const ICONS = {
  restaurant: emojiIcon('🍽️'),
  home: emojiIcon('🏠'),
  rider: emojiIcon('🛵', 'map-pin-rider'),
  pin: emojiIcon('📍'),
};

const Base = ({ center, zoom = 14, children, className = 'map', ...rest }) => (
  <MapContainer center={[center.lat, center.lng]} zoom={zoom} scrollWheelZoom={false} className={className} {...rest}>
    <TileLayer url={TILE_URL} attribution={ATTRIBUTION} />
    {children}
  </MapContainer>
);

// Keep every point in view as the rider moves.
const FitBounds = ({ points }) => {
  const map = useMap();
  const key = points.map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join('|');
  useEffect(() => {
    if (points.length === 1) map.setView([points[0].lat, points[0].lng], 15);
    if (points.length > 1) map.fitBounds(points.map((p) => [p.lat, p.lng]), { padding: [40, 40], maxZoom: 16 });
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
};

/** Restaurant → rider → customer, used on the tracking and rider pages. */
export const DeliveryMap = ({ restaurant, home, rider, restaurantName = 'Restaurant', className }) => {
  const points = [restaurant, rider, home].filter(Boolean);
  if (!points.length) return null;
  return (
    <Base center={points[0]} className={className}>
      <FitBounds points={points} />
      {restaurant && (
        <Marker position={[restaurant.lat, restaurant.lng]} icon={ICONS.restaurant}>
          <Popup>{restaurantName}</Popup>
        </Marker>
      )}
      {home && (
        <Marker position={[home.lat, home.lng]} icon={ICONS.home}>
          <Popup>Delivery address</Popup>
        </Marker>
      )}
      {rider && (
        <Marker position={[rider.lat, rider.lng]} icon={ICONS.rider}>
          <Popup>Your rider</Popup>
        </Marker>
      )}
      {restaurant && home && (
        <Polyline positions={[[restaurant.lat, restaurant.lng], ...(rider ? [[rider.lat, rider.lng]] : []), [home.lat, home.lng]]} pathOptions={{ color: '#FF4500', weight: 4, dashArray: '8 10', opacity: 0.7 }} />
      )}
    </Base>
  );
};

const ClickToMove = ({ onChange }) => {
  useMapEvents({ click: (e) => onChange({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
};

const Recenter = ({ point }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([point.lat, point.lng], Math.max(map.getZoom(), 16));
  }, [point.lat, point.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
};

/** Drag the pin (or tap the map) to fine-tune the delivery point. */
export const LocationPicker = ({ value, onChange }) => (
  <Base center={value} zoom={16} className="map map-sm">
    <Recenter point={value} />
    <ClickToMove onChange={onChange} />
    <Marker
      position={[value.lat, value.lng]}
      icon={ICONS.pin}
      draggable
      eventHandlers={{ dragend: (e) => onChange({ lat: e.target.getLatLng().lat, lng: e.target.getLatLng().lng }) }}
    />
  </Base>
);
