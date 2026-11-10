import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api, { errorMessage } from '../api';
import ImageUpload from '../components/ImageUpload';

const EMPTY = { name: '', image: '', cuisine: '', address: '', lat: '', lng: '', deliveryTime: '30-40 mins', prepTimeMins: 15, deliveryFee: 30, minimumOrder: 100, offers: '', pureVeg: false };

const Restaurants = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    try {
      const { data } = await api.get('/restaurants');
      setRestaurants(data);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const startEdit = (r) => {
    setEditing(r._id);
    setForm({
      ...EMPTY,
      ...r,
      cuisine: r.cuisine.join(', '),
      offers: r.offers.join(' | '),
      lat: r.location.coordinates[1],
      lng: r.location.coordinates[0],
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = async (e) => {
    e.preventDefault();
    const body = {
      name: form.name,
      image: form.image,
      address: form.address,
      cuisine: form.cuisine.split(',').map((s) => s.trim()).filter(Boolean),
      offers: form.offers ? form.offers.split('|').map((s) => s.trim()).filter(Boolean) : [],
      lat: Number(form.lat),
      lng: Number(form.lng),
      deliveryTime: form.deliveryTime,
      prepTimeMins: Number(form.prepTimeMins),
      deliveryFee: Number(form.deliveryFee),
      minimumOrder: Number(form.minimumOrder),
      pureVeg: form.pureVeg,
    };
    try {
      if (editing) await api.put(`/restaurants/${editing}`, body);
      else await api.post('/restaurants', body);
      toast.success(editing ? 'Restaurant updated' : 'Restaurant added');
      setForm(EMPTY);
      setEditing(null);
      fetchAll();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const remove = async (r) => {
     
    if (!window.confirm(`Delete ${r.name} and its whole menu?`)) return;
    try {
      await api.delete(`/restaurants/${r._id}`);
      toast.success('Deleted');
      fetchAll();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const toggleOpen = async (r) => {
    try {
      await api.put(`/restaurants/${r._id}`, { isOpen: !r.isOpen });
      fetchAll();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const useMyLocation = () =>
    navigator.geolocation?.getCurrentPosition(
      (p) => setForm((f) => ({ ...f, lat: p.coords.latitude.toFixed(6), lng: p.coords.longitude.toFixed(6) })),
      () => toast.error('Location unavailable'),
    );

  return (
    <div>
      <h2 className="title">Restaurants</h2>
      <form className="card form-grid" onSubmit={submit}>
        <h3 className="span-2">{editing ? `Edit ${form.name}` : 'Add new restaurant'}</h3>
        <label className="field"><span>Name</span><input value={form.name} onChange={set('name')} required /></label>
        <label className="field"><span>Cuisines (comma separated)</span><input value={form.cuisine} onChange={set('cuisine')} placeholder="South Indian, Chinese" required /></label>
        <label className="field span-2"><span>Address</span><input value={form.address} onChange={set('address')} required /></label>
        <label className="field"><span>Latitude</span><input type="number" step="any" value={form.lat} onChange={set('lat')} required /></label>
        <label className="field"><span>Longitude <button type="button" className="link small" onClick={useMyLocation}>use my location</button></span><input type="number" step="any" value={form.lng} onChange={set('lng')} required /></label>
        <label className="field"><span>Base delivery fee (₹)</span><input type="number" min="0" value={form.deliveryFee} onChange={set('deliveryFee')} /></label>
        <label className="field"><span>Minimum order (₹)</span><input type="number" min="0" value={form.minimumOrder} onChange={set('minimumOrder')} /></label>
        <label className="field"><span>Prep time (mins, for ETA)</span><input type="number" min="5" max="120" value={form.prepTimeMins} onChange={set('prepTimeMins')} /></label>
        <label className="field"><span>Delivery time label</span><input value={form.deliveryTime} onChange={set('deliveryTime')} /></label>
        <label className="field span-2"><span>Offer banners (separate with |)</span><input value={form.offers} onChange={set('offers')} placeholder="Use HUNGRY20 for 20% off | Free raita above ₹250" /></label>
        <div className="field span-2"><span>Image</span><ImageUpload folder="restaurants" value={form.image} onChange={(image) => setForm({ ...form, image })} /></div>
        <label className="check"><input type="checkbox" checked={form.pureVeg} onChange={set('pureVeg')} /> Pure veg restaurant</label>
        <div className="row gap-8 span-2">
          <button type="submit" className="btn btn-primary">{editing ? 'Save changes' : '+ Add restaurant'}</button>
          {editing && <button type="button" className="btn btn-ghost" onClick={() => { setEditing(null); setForm(EMPTY); }}>Cancel</button>}
        </div>
      </form>

      {loading ? <p className="muted">Loading…</p> : (
        <div className="cards">
          {restaurants.map((r) => (
            <div key={r._id} className="card">
              <img className="card-img" src={r.image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400'} alt="" />
              <h4>{r.name} {r.pureVeg && <span className="pill pill-delivered">Veg</span>}</h4>
              <p className="muted small">{r.address}</p>
              <p className="small">⭐ {r.totalRatings ? r.rating.toFixed(1) : 'New'} ({r.totalRatings}) · {r.cuisine.join(', ')}</p>
              <p className="small muted">Fee ₹{r.deliveryFee} · Min ₹{r.minimumOrder}</p>
              <div className="row gap-8" style={{ marginTop: 10 }}>
                <button type="button" onClick={() => toggleOpen(r)} className={`btn btn-sm ${r.isOpen ? 'btn-success' : 'btn-danger'}`}>{r.isOpen ? 'Open' : 'Closed'}</button>
                <button type="button" onClick={() => startEdit(r)} className="btn btn-sm btn-ghost">✏️ Edit</button>
                <button type="button" onClick={() => remove(r)} className="btn btn-sm btn-danger" aria-label={`Delete ${r.name}`}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Restaurants;
