import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api, { errorMessage } from '../api';
import ImageUpload from '../components/ImageUpload';

const EMPTY = { name: '', description: '', price: '', image: '', category: '', isVeg: true, offer: '', isBestseller: false };

const Menu = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [selected, setSelected] = useState(() => sessionStorage.getItem('admin_menu_rest') || '');
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    api.get('/restaurants').then(({ data }) => setRestaurants(data)).catch((e) => toast.error(errorMessage(e)));
  }, []);

  const loadItems = (id = selected) =>
    id && api.get(`/menu/${id}`, { params: { all: true } }).then(({ data }) => setItems(data.items)).catch((e) => toast.error(errorMessage(e)));

  useEffect(() => {
    sessionStorage.setItem('admin_menu_rest', selected);
    loadItems(selected);
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const body = { ...form, price: Number(form.price) };
    delete body._id; delete body.restaurantId; delete body.createdAt; delete body.updatedAt; delete body.__v; delete body.isAvailable;
    try {
      if (editing) await api.put(`/menu/${editing}`, body);
      else await api.post('/menu', { ...body, restaurantId: selected });
      toast.success(editing ? 'Item updated' : 'Item added');
      setForm(EMPTY);
      setEditing(null);
      loadItems();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const toggle = async (item) => {
    try {
      await api.put(`/menu/${item._id}`, { isAvailable: !item.isAvailable });
      loadItems();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const remove = async (item) => {
     
    if (!window.confirm(`Delete ${item.name}?`)) return;
    try {
      await api.delete(`/menu/${item._id}`);
      loadItems();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const categories = [...new Set(items.map((i) => i.category))];

  return (
    <div>
      <h2 className="title">Menu</h2>
      <div className="card">
        <label className="field" style={{ maxWidth: 360 }}>
          <span>Restaurant</span>
          <select value={selected} onChange={(e) => { setSelected(e.target.value); setEditing(null); setForm(EMPTY); }}>
            <option value="">— Choose restaurant —</option>
            {restaurants.map((r) => <option key={r._id} value={r._id}>{r.name}</option>)}
          </select>
        </label>
      </div>

      {selected && (
        <>
          <form className="card form-grid" onSubmit={submit}>
            <h3 className="span-2">{editing ? `Edit ${form.name}` : 'Add menu item'}</h3>
            <label className="field"><span>Name</span><input value={form.name} onChange={set('name')} required /></label>
            <label className="field"><span>Price (₹)</span><input type="number" min="1" value={form.price} onChange={set('price')} required /></label>
            <label className="field"><span>Category</span><input value={form.category} onChange={set('category')} list="cats" placeholder="Starters" required /><datalist id="cats">{categories.map((c) => <option key={c} value={c} />)}</datalist></label>
            <label className="field"><span>Offer tag (optional)</span><input value={form.offer} onChange={set('offer')} placeholder="10% off" /></label>
            <label className="field span-2"><span>Description</span><input value={form.description} onChange={set('description')} /></label>
            <div className="field span-2"><span>Image</span><ImageUpload folder="menu" value={form.image} onChange={(image) => setForm({ ...form, image })} /></div>
            <div className="row gap-16">
              <label className="check"><input type="checkbox" checked={form.isVeg} onChange={set('isVeg')} /> Veg</label>
              <label className="check"><input type="checkbox" checked={form.isBestseller} onChange={set('isBestseller')} /> Bestseller</label>
            </div>
            <div className="row gap-8">
              <button type="submit" className="btn btn-primary">{editing ? 'Save' : '+ Add item'}</button>
              {editing && <button type="button" className="btn btn-ghost" onClick={() => { setEditing(null); setForm(EMPTY); }}>Cancel</button>}
            </div>
          </form>

          <div className="cards">
            {items.map((item) => (
              <div key={item._id} className={`card ${item.isAvailable ? '' : 'faded'}`}>
                <img className="card-img sm" src={item.image || 'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=300'} alt="" />
                <div className="row between">
                  <h4>{item.isVeg ? '🟢' : '🔴'} {item.name}</h4>
                  <b>₹{item.price}</b>
                </div>
                <p className="muted small">{item.category}{item.isBestseller ? ' · ⭐ Bestseller' : ''}</p>
                <div className="row gap-8" style={{ marginTop: 10 }}>
                  <button type="button" className={`btn btn-sm ${item.isAvailable ? 'btn-success' : 'btn-danger'}`} onClick={() => toggle(item)}>{item.isAvailable ? 'In stock' : 'Sold out'}</button>
                  <button type="button" className="btn btn-sm btn-ghost" onClick={() => { setEditing(item._id); setForm({ ...EMPTY, ...item }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>✏️</button>
                  <button type="button" className="btn btn-sm btn-danger" onClick={() => remove(item)} aria-label={`Delete ${item.name}`}>🗑</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Menu;
