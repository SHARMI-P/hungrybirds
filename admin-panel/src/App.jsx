import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
let token = localStorage.getItem('admin_token') || '';

const api = axios.create({ baseURL: API_URL });
api.interceptors.request.use(c => { c.headers.Authorization = `Bearer ${token}`; return c; });

// ─── LOGIN ──────────────────────────────────────────────────────────
const LoginScreen = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/auth/login', { email, password });
      if (data.role !== 'admin') { setError('Admin access only'); return; }
      token = data.token;
      localStorage.setItem('admin_token', token);
      onLogin(data);
    } catch {
      setError('Invalid credentials');
    }
  };

  return (
    <div style={{ minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#F8F8F8' }}>
      <div style={{ background:'white',padding:'48px 40px',borderRadius:20,boxShadow:'0 8px 40px rgba(0,0,0,0.1)',width:380 }}>
        <h1 style={{ fontFamily:'Syne,sans-serif',fontSize:'1.8rem',color:'#FF4500',textAlign:'center',marginBottom:8 }}>🐦 HungryBirds</h1>
        <p style={{ textAlign:'center',color:'#6B7280',marginBottom:32 }}>Admin Panel</p>
        {error && <div style={{ background:'#FEE2E2',color:'#DC2626',padding:12,borderRadius:8,marginBottom:16 }}>{error}</div>}
        <form onSubmit={handleLogin}>
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Admin Email" type="email" required
            style={{ width:'100%',padding:'12px 16px',border:'1.5px solid #E5E7EB',borderRadius:10,marginBottom:12,fontSize:'0.95rem',boxSizing:'border-box' }}/>
          <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" type="password" required
            style={{ width:'100%',padding:'12px 16px',border:'1.5px solid #E5E7EB',borderRadius:10,marginBottom:20,fontSize:'0.95rem',boxSizing:'border-box' }}/>
          <button type="submit" style={{ width:'100%',background:'#FF4500',color:'white',border:'none',padding:14,borderRadius:50,fontWeight:700,fontSize:'1rem',cursor:'pointer' }}>
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
};

// ─── RESTAURANTS TAB ────────────────────────────────────────────────
const RestaurantsTab = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [form, setForm]     = useState({ name:'',image:'',cuisine:'',address:'',lat:'',lng:'',deliveryTime:'30-40 mins',deliveryFee:30,minimumOrder:100,offers:'' });
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try { const { data } = await api.get('/restaurants'); setRestaurants(data); }
    catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await api.post('/restaurants', {
        ...form,
        cuisine: form.cuisine.split(',').map(s=>s.trim()),
        offers:  form.offers ? [form.offers] : [],
      });
      alert('Restaurant added!');
      setForm({ name:'',image:'',cuisine:'',address:'',lat:'',lng:'',deliveryTime:'30-40 mins',deliveryFee:30,minimumOrder:100,offers:'' });
      fetchAll();
    } catch(e) { alert('Error: ' + e.response?.data?.message); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this restaurant?')) return;
    await api.delete(`/restaurants/${id}`);
    fetchAll();
  };

  const toggleOpen = async (r) => {
    await api.put(`/restaurants/${r._id}`, { isOpen: !r.isOpen });
    fetchAll();
  };

  return (
    <div>
      <h2 style={sectionTitle}>🏪 Restaurants</h2>

      {/* Add Form */}
      <div style={card}>
        <h3 style={{ marginBottom:20 }}>Add New Restaurant</h3>
        <form onSubmit={handleAdd} style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
          {[['name','Restaurant Name'],['image','Image URL'],['cuisine','Cuisines (comma separated)'],
            ['address','Full Address'],['lat','Latitude'],['lng','Longitude'],
            ['deliveryTime','Delivery Time'],['deliveryFee','Delivery Fee (₹)'],
            ['minimumOrder','Min Order (₹)'],['offers','Offer Text (optional)']].map(([key,label])=>(
            <div key={key}>
              <label style={{ display:'block',fontSize:'0.85rem',fontWeight:500,marginBottom:4 }}>{label}</label>
              <input value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})}
                placeholder={label} required={!['image','offers'].includes(key)}
                style={{ width:'100%',padding:'10px 14px',border:'1.5px solid #E5E7EB',borderRadius:8,fontSize:'0.9rem',boxSizing:'border-box' }}/>
            </div>
          ))}
          <div style={{ gridColumn:'span 2' }}>
            <button type="submit" style={btnPrimary}>+ Add Restaurant</button>
          </div>
        </form>
      </div>

      {/* List */}
      {loading ? <p>Loading...</p> : (
        <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:16 }}>
          {restaurants.map(r => (
            <div key={r._id} style={card}>
              <img src={r.image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400'}
                alt={r.name} style={{ width:'100%',height:140,objectFit:'cover',borderRadius:12,marginBottom:12 }}/>
              <h4 style={{ marginBottom:4 }}>{r.name}</h4>
              <p style={{ color:'#6B7280',fontSize:'0.85rem',marginBottom:8 }}>{r.address}</p>
              <p style={{ fontSize:'0.8rem',marginBottom:12 }}>⭐{r.rating} · {r.cuisine?.join(', ')}</p>
              <div style={{ display:'flex',gap:8 }}>
                <button onClick={()=>toggleOpen(r)} style={{ ...btnSmall, background: r.isOpen ? '#D1FAE5' : '#FEE2E2', color: r.isOpen ? '#059669' : '#DC2626' }}>
                  {r.isOpen ? '✅ Open' : '❌ Closed'}
                </button>
                <button onClick={()=>handleDelete(r._id)} style={{ ...btnSmall,background:'#FEE2E2',color:'#DC2626' }}>🗑 Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── MENU TAB ────────────────────────────────────────────────────────
const MenuTab = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRest, setSelectedRest] = useState('');
  const [items, setItems]   = useState([]);
  const [form, setForm]     = useState({ name:'',description:'',price:'',image:'',category:'',isVeg:true,offer:'',isBestseller:false });

  useEffect(() => {
    api.get('/restaurants').then(({data})=>setRestaurants(data));
  }, []);

  useEffect(() => {
    if (!selectedRest) return;
    api.get(`/menu/${selectedRest}`).then(({data})=>setItems(data.items || []));
  }, [selectedRest]);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await api.post('/menu', { ...form, restaurantId: selectedRest, price: parseFloat(form.price) });
      alert('Menu item added!');
      setForm({ name:'',description:'',price:'',image:'',category:'',isVeg:true,offer:'',isBestseller:false });
      api.get(`/menu/${selectedRest}`).then(({data})=>setItems(data.items || []));
    } catch(e) { alert('Error: ' + e.response?.data?.message); }
  };

  const handleDelete = async (id) => {
    await api.delete(`/menu/${id}`);
    setItems(items.filter(i=>i._id!==id));
  };

  return (
    <div>
      <h2 style={sectionTitle}>🍽️ Menu Management</h2>
      <div style={card}>
        <label style={{ fontWeight:600,marginBottom:8,display:'block' }}>Select Restaurant</label>
        <select value={selectedRest} onChange={e=>setSelectedRest(e.target.value)}
          style={{ padding:'10px 14px',border:'1.5px solid #E5E7EB',borderRadius:8,fontSize:'0.9rem',minWidth:260 }}>
          <option value="">-- Choose Restaurant --</option>
          {restaurants.map(r=><option key={r._id} value={r._id}>{r.name}</option>)}
        </select>
      </div>

      {selectedRest && (
        <>
          <div style={card}>
            <h3 style={{ marginBottom:20 }}>Add Menu Item</h3>
            <form onSubmit={handleAdd} style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
              {[['name','Item Name'],['description','Description'],['price','Price (₹)'],
                ['image','Image URL'],['category','Category (e.g. Starters)'],['offer','Offer (optional)']].map(([k,l])=>(
                <div key={k}>
                  <label style={{ display:'block',fontSize:'0.85rem',fontWeight:500,marginBottom:4 }}>{l}</label>
                  <input value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}
                    placeholder={l} required={!['image','offer'].includes(k)}
                    style={{ width:'100%',padding:'10px 14px',border:'1.5px solid #E5E7EB',borderRadius:8,boxSizing:'border-box' }}/>
                </div>
              ))}
              <div style={{ display:'flex',gap:24,alignItems:'center' }}>
                <label style={{ display:'flex',alignItems:'center',gap:6,cursor:'pointer' }}>
                  <input type="checkbox" checked={form.isVeg} onChange={e=>setForm({...form,isVeg:e.target.checked})}/> Veg
                </label>
                <label style={{ display:'flex',alignItems:'center',gap:6,cursor:'pointer' }}>
                  <input type="checkbox" checked={form.isBestseller} onChange={e=>setForm({...form,isBestseller:e.target.checked})}/> Bestseller
                </label>
              </div>
              <div>
                <button type="submit" style={btnPrimary}>+ Add Item</button>
              </div>
            </form>
          </div>

          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:16 }}>
            {items.map(item=>(
              <div key={item._id} style={card}>
                <img src={item.image||'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=200'}
                  alt={item.name} style={{ width:'100%',height:120,objectFit:'cover',borderRadius:10,marginBottom:10 }}
                  onError={e=>{e.target.src='https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=200'}}/>
                <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start' }}>
                  <div>
                    <h4 style={{ fontSize:'0.95rem' }}>{item.name}</h4>
                    <p style={{ color:'#6B7280',fontSize:'0.8rem' }}>{item.category}</p>
                    <p style={{ fontWeight:700,marginTop:4 }}>₹{item.price}</p>
                  </div>
                  <span style={{ fontSize:'0.75rem' }}>{item.isVeg ? '🟢' : '🔴'}</span>
                </div>
                <button onClick={()=>handleDelete(item._id)}
                  style={{ ...btnSmall,background:'#FEE2E2',color:'#DC2626',marginTop:10,width:'100%' }}>
                  🗑 Delete
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ─── ORDERS TAB ──────────────────────────────────────────────────────
const OrdersTab = () => {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    try { const { data } = await api.get('/orders'); setOrders(data); }
    catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  const updateStatus = async (id, status) => {
    await api.put(`/orders/${id}/status`, { status });
    fetchOrders();
  };

  const statusColors = {
    placed:'#FEF3C7',confirmed:'#DBEAFE',preparing:'#FFF3EE',
    picked_up:'#F3E8FF',delivered:'#D1FAE5',cancelled:'#FEE2E2'
  };
  const statusText = {
    placed:'#D97706',confirmed:'#2563EB',preparing:'#FF4500',
    picked_up:'#7C3AED',delivered:'#059669',cancelled:'#DC2626'
  };

  return (
    <div>
      <h2 style={sectionTitle}>📦 Orders ({orders.length})</h2>
      {loading ? <p>Loading...</p> : (
        <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
          {orders.map(o=>(
            <div key={o._id} style={{ ...card,display:'flex',justifyContent:'space-between',alignItems:'center',gap:16,flexWrap:'wrap' }}>
              <div>
                <div style={{ fontWeight:700,marginBottom:4 }}>#{o._id?.slice(-8).toUpperCase()}</div>
                <div style={{ color:'#6B7280',fontSize:'0.85rem' }}>{o.userId?.name} · {o.restaurantId?.name}</div>
                <div style={{ fontSize:'0.8rem',color:'#6B7280',marginTop:4 }}>
                  {o.items?.length} items · ₹{o.finalAmount} · {new Date(o.createdAt).toLocaleDateString('en-IN')}
                </div>
              </div>
              <div style={{ display:'flex',alignItems:'center',gap:12 }}>
                <span style={{ padding:'4px 14px',borderRadius:50,fontSize:'0.8rem',fontWeight:700,
                  background:statusColors[o.orderStatus]||'#F3F4F6',color:statusText[o.orderStatus]||'#1A1A1A' }}>
                  {o.orderStatus?.replace('_',' ')}
                </span>
                <select value={o.orderStatus} onChange={e=>updateStatus(o._id,e.target.value)}
                  style={{ padding:'6px 12px',border:'1.5px solid #E5E7EB',borderRadius:8,fontSize:'0.85rem',cursor:'pointer' }}>
                  {['placed','confirmed','preparing','picked_up','delivered','cancelled'].map(s=>(
                    <option key={s} value={s}>{s.replace('_',' ')}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
          {orders.length===0 && <p style={{ color:'#6B7280',textAlign:'center',padding:40 }}>No orders yet</p>}
        </div>
      )}
    </div>
  );
};

// ─── AGENTS TAB ──────────────────────────────────────────────────────
const AgentsTab = () => {
  const [agents, setAgents] = useState([]);
  const [form, setForm]     = useState({ name:'',phone:'',email:'',vehicleType:'bike',vehicleNumber:'' });

  useEffect(() => { api.get('/agents').then(({data})=>setAgents(data)); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await api.post('/agents', { ...form, isOnline: true });
      alert('Agent added!');
      setForm({ name:'',phone:'',email:'',vehicleType:'bike',vehicleNumber:'' });
      api.get('/agents').then(({data})=>setAgents(data));
    } catch(e) { alert('Error: ' + e.response?.data?.message); }
  };

  const handleDelete = async (id) => {
    await api.delete(`/agents/${id}`);
    setAgents(agents.filter(a=>a._id!==id));
  };

  const toggleOnline = async (a) => {
    await api.put(`/agents/${a._id}`, { isOnline: !a.isOnline, isAvailable: !a.isOnline });
    api.get('/agents').then(({data})=>setAgents(data));
  };

  return (
    <div>
      <h2 style={sectionTitle}>🛵 Delivery Agents</h2>
      <div style={card}>
        <h3 style={{ marginBottom:20 }}>Add New Agent</h3>
        <form onSubmit={handleAdd} style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
          {[['name','Full Name'],['phone','Phone'],['email','Email'],['vehicleNumber','Vehicle Number']].map(([k,l])=>(
            <div key={k}>
              <label style={{ display:'block',fontSize:'0.85rem',fontWeight:500,marginBottom:4 }}>{l}</label>
              <input value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})} placeholder={l} required
                style={{ width:'100%',padding:'10px 14px',border:'1.5px solid #E5E7EB',borderRadius:8,boxSizing:'border-box' }}/>
            </div>
          ))}
          <div>
            <label style={{ display:'block',fontSize:'0.85rem',fontWeight:500,marginBottom:4 }}>Vehicle Type</label>
            <select value={form.vehicleType} onChange={e=>setForm({...form,vehicleType:e.target.value})}
              style={{ width:'100%',padding:'10px 14px',border:'1.5px solid #E5E7EB',borderRadius:8 }}>
              <option value="bike">Bike</option>
              <option value="scooter">Scooter</option>
              <option value="bicycle">Bicycle</option>
            </select>
          </div>
          <div style={{ display:'flex',alignItems:'flex-end' }}>
            <button type="submit" style={btnPrimary}>+ Add Agent</button>
          </div>
        </form>
      </div>
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:16 }}>
        {agents.map(a=>(
          <div key={a._id} style={card}>
            <div style={{ display:'flex',alignItems:'center',gap:14,marginBottom:12 }}>
              <div style={{ width:50,height:50,borderRadius:'50%',background:'#FFF3EE',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.5rem' }}>🧑</div>
              <div>
                <h4>{a.name}</h4>
                <p style={{ color:'#6B7280',fontSize:'0.85rem' }}>{a.phone}</p>
              </div>
            </div>
            <p style={{ fontSize:'0.85rem',marginBottom:4 }}>🏍 {a.vehicleType} · {a.vehicleNumber}</p>
            <p style={{ fontSize:'0.85rem',marginBottom:12 }}>⭐ {a.rating} · {a.totalDeliveries} deliveries</p>
            <div style={{ display:'flex',gap:8 }}>
              <button onClick={()=>toggleOnline(a)}
                style={{ ...btnSmall, background:a.isOnline?'#D1FAE5':'#F3F4F6', color:a.isOnline?'#059669':'#6B7280' }}>
                {a.isOnline ? '🟢 Online' : '⚫ Offline'}
              </button>
              <button onClick={()=>handleDelete(a._id)} style={{ ...btnSmall,background:'#FEE2E2',color:'#DC2626' }}>🗑</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── STYLES ──────────────────────────────────────────────────────────
const card       = { background:'white',borderRadius:16,padding:20,boxShadow:'0 2px 12px rgba(0,0,0,0.07)',marginBottom:16 };
const sectionTitle = { fontFamily:'Syne,sans-serif',fontSize:'1.5rem',marginBottom:20 };
const btnPrimary = { background:'#FF4500',color:'white',border:'none',padding:'12px 24px',borderRadius:50,fontWeight:700,cursor:'pointer',fontSize:'0.9rem' };
const btnSmall   = { border:'none',padding:'6px 14px',borderRadius:50,fontWeight:600,cursor:'pointer',fontSize:'0.8rem' };

// ─── MAIN APP ────────────────────────────────────────────────────────
const AdminApp = () => {
  const [user, setUser]   = useState(() => {
    const t = localStorage.getItem('admin_token');
    return t ? { token: t } : null;
  });
  const [tab, setTab] = useState('restaurants');

  if (!user) return <LoginScreen onLogin={setUser} />;

  const tabs = [
    { id:'restaurants', label:'🏪 Restaurants' },
    { id:'menu',        label:'🍽️ Menu' },
    { id:'orders',      label:'📦 Orders' },
    { id:'agents',      label:'🛵 Agents' },
  ];

  return (
    <div style={{ fontFamily:'DM Sans,sans-serif',minHeight:'100vh',background:'#F8F8F8' }}>
      {/* Top bar */}
      <div style={{ background:'white',padding:'16px 32px',display:'flex',justifyContent:'space-between',
        alignItems:'center',boxShadow:'0 2px 12px rgba(0,0,0,0.06)',position:'sticky',top:0,zIndex:100 }}>
        <span style={{ fontFamily:'Syne,sans-serif',fontSize:'1.4rem',fontWeight:800,color:'#FF4500' }}>
          🐦 HungryBirds Admin
        </span>
        <button onClick={()=>{ localStorage.removeItem('admin_token'); setUser(null); }}
          style={{ border:'2px solid #FF4500',background:'transparent',color:'#FF4500',padding:'8px 20px',borderRadius:50,cursor:'pointer',fontWeight:600 }}>
          Logout
        </button>
      </div>

      {/* Tab Nav */}
      <div style={{ background:'white',borderBottom:'1px solid #F3F4F6',padding:'0 32px',display:'flex',gap:4 }}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{ border:'none',background:'transparent',padding:'16px 20px',cursor:'pointer',
              fontWeight:600,fontSize:'0.9rem',fontFamily:'DM Sans',
              borderBottom: tab===t.id ? '3px solid #FF4500' : '3px solid transparent',
              color: tab===t.id ? '#FF4500' : '#6B7280' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ maxWidth:1200,margin:'0 auto',padding:'32px 24px' }}>
        {tab==='restaurants' && <RestaurantsTab />}
        {tab==='menu'        && <MenuTab />}
        {tab==='orders'      && <OrdersTab />}
        {tab==='agents'      && <AgentsTab />}
      </div>
    </div>
  );
};

export default AdminApp;
