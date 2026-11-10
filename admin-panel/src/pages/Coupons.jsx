import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api, { errorMessage } from '../api';

const EMPTY = { code: '', description: '', type: 'percent', value: 20, maxDiscount: 100, minOrder: 199, firstOrderOnly: false, restaurantId: '', expiresAt: '' };

const Coupons = () => {
  const [coupons, setCoupons] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [form, setForm] = useState(EMPTY);

  const load = () => api.get('/coupons/all').then(({ data }) => setCoupons(data)).catch((e) => toast.error(errorMessage(e)));
  useEffect(() => {
    load();
    api.get('/restaurants').then(({ data }) => setRestaurants(data)).catch(() => {});
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const restaurantName = (id) => restaurants.find((r) => r._id === id)?.name;

  const add = async (e) => {
    e.preventDefault();
    try {
      await api.post('/coupons', {
        ...form,
        value: Number(form.value),
        maxDiscount: Number(form.maxDiscount || 0),
        minOrder: Number(form.minOrder || 0),
        restaurantId: form.restaurantId || null,
        expiresAt: form.expiresAt || null,
      });
      toast.success('Coupon created');
      setForm(EMPTY);
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const toggle = async (c) => {
    await api.put(`/coupons/${c._id}`, { isActive: !c.isActive }).catch((e) => toast.error(errorMessage(e)));
    load();
  };
  const remove = async (c) => {
    await api.delete(`/coupons/${c._id}`).catch((e) => toast.error(errorMessage(e)));
    load();
  };

  return (
    <div>
      <h2 className="title">Coupons</h2>
      <form className="card form-grid" onSubmit={add}>
        <h3 className="span-2">Create coupon</h3>
        <label className="field"><span>Code</span><input value={form.code} onChange={set('code')} placeholder="HUNGRY20" required /></label>
        <label className="field"><span>Description</span><input value={form.description} onChange={set('description')} placeholder="20% off up to ₹100" /></label>
        <label className="field"><span>Type</span>
          <select value={form.type} onChange={set('type')}><option value="percent">Percent %</option><option value="flat">Flat ₹</option></select>
        </label>
        <label className="field"><span>Value ({form.type === 'percent' ? '%' : '₹'})</span><input type="number" min="1" value={form.value} onChange={set('value')} required /></label>
        {form.type === 'percent' && <label className="field"><span>Max discount (₹, 0 = no cap)</span><input type="number" min="0" value={form.maxDiscount} onChange={set('maxDiscount')} /></label>}
        <label className="field"><span>Minimum order (₹)</span><input type="number" min="0" value={form.minOrder} onChange={set('minOrder')} /></label>
        <label className="field"><span>Restaurant</span>
          <select value={form.restaurantId} onChange={set('restaurantId')}>
            <option value="">All restaurants</option>
            {restaurants.map((r) => <option key={r._id} value={r._id}>{r.name}</option>)}
          </select>
        </label>
        <label className="field"><span>Expires (optional)</span><input type="date" value={form.expiresAt} onChange={set('expiresAt')} /></label>
        <label className="check"><input type="checkbox" checked={form.firstOrderOnly} onChange={set('firstOrderOnly')} /> First order only</label>
        <div className="span-2"><button type="submit" className="btn btn-primary">+ Create coupon</button></div>
      </form>

      <table className="table card">
        <thead><tr><th>Code</th><th>Discount</th><th>Min order</th><th>Scope</th><th>Expires</th><th>Status</th><th /></tr></thead>
        <tbody>
          {coupons.map((c) => (
            <tr key={c._id}>
              <td><b>{c.code}</b><div className="muted small">{c.description}</div></td>
              <td>{c.type === 'percent' ? `${c.value}%${c.maxDiscount ? ` (max ₹${c.maxDiscount})` : ''}` : `₹${c.value}`}{c.firstOrderOnly && <div className="muted small">first order</div>}</td>
              <td>₹{c.minOrder}</td>
              <td>{c.restaurantId ? restaurantName(c.restaurantId) || 'One restaurant' : 'All'}</td>
              <td>{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('en-IN') : '—'}</td>
              <td><button type="button" className={`btn btn-sm ${c.isActive ? 'btn-success' : 'btn-ghost'}`} onClick={() => toggle(c)}>{c.isActive ? 'Active' : 'Paused'}</button></td>
              <td><button type="button" className="btn btn-sm btn-danger" onClick={() => remove(c)} aria-label={`Delete ${c.code}`}>🗑</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Coupons;
