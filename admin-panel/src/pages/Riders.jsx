import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api, { errorMessage } from '../api';

const EMPTY = { name: '', phone: '', email: '', password: '', vehicleType: 'bike', vehicleNumber: '' };

const Riders = () => {
  const [riders, setRiders] = useState([]);
  const [form, setForm] = useState(EMPTY);

  const load = () => api.get('/agents').then(({ data }) => setRiders(data)).catch((e) => toast.error(errorMessage(e)));
  useEffect(() => {
    load();
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const add = async (e) => {
    e.preventDefault();
    try {
      await api.post('/agents', form);
      toast.success(`Rider added — they can log in at the customer site with ${form.email}`);
      setForm(EMPTY);
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const toggle = async (r) => {
    try {
      await api.put(`/agents/${r._id}`, { isOnline: !r.isOnline });
      load();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const remove = async (r) => {
     
    if (!window.confirm(`Remove ${r.name}? Their login will be deleted too.`)) return;
    try {
      await api.delete(`/agents/${r._id}`);
      load();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <div>
      <h2 className="title">Delivery riders</h2>
      <form className="card form-grid" onSubmit={add}>
        <h3 className="span-2">Add rider</h3>
        <label className="field"><span>Full name</span><input value={form.name} onChange={set('name')} required /></label>
        <label className="field"><span>Phone</span><input value={form.phone} onChange={set('phone')} pattern="[6-9][0-9]{9}" title="10-digit mobile number" required /></label>
        <label className="field"><span>Email (login)</span><input type="email" value={form.email} onChange={set('email')} required /></label>
        <label className="field"><span>Temporary password</span><input type="text" value={form.password} onChange={set('password')} minLength={8} required /></label>
        <label className="field"><span>Vehicle</span>
          <select value={form.vehicleType} onChange={set('vehicleType')}>
            <option value="bike">Bike</option><option value="scooter">Scooter</option><option value="bicycle">Bicycle</option>
          </select>
        </label>
        <label className="field"><span>Vehicle number</span><input value={form.vehicleNumber} onChange={set('vehicleNumber')} /></label>
        <div className="span-2"><button type="submit" className="btn btn-primary">+ Add rider</button></div>
      </form>

      <div className="cards">
        {riders.map((r) => (
          <div key={r._id} className="card">
            <div className="row gap-12" style={{ marginBottom: 10 }}>
              <div className="avatar">🧑</div>
              <div>
                <h4>{r.name}</h4>
                <p className="muted small">{r.phone} · {r.email}</p>
              </div>
            </div>
            <p className="small">🏍 {r.vehicleType} · {r.vehicleNumber || '—'}</p>
            <p className="small">⭐ {r.rating} · {r.totalDeliveries} deliveries</p>
            <p className="small">
              {r.currentOrderId ? <>📦 On delivery ({r.currentOrderId.restaurantName})</> : r.isOnline ? '✅ Free' : '—'}
              {r.lastLocationAt && <span className="muted"> · GPS {new Date(r.lastLocationAt).toLocaleTimeString('en-IN', { timeStyle: 'short' })}</span>}
            </p>
            <div className="row gap-8" style={{ marginTop: 10 }}>
              <button type="button" onClick={() => toggle(r)} className={`btn btn-sm ${r.isOnline ? 'btn-success' : 'btn-ghost'}`}>{r.isOnline ? '🟢 Online' : '⚫ Offline'}</button>
              <button type="button" onClick={() => remove(r)} className="btn btn-sm btn-danger" aria-label={`Remove ${r.name}`}>🗑</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Riders;
