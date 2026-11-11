import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import toast from 'react-hot-toast';
import api, { errorMessage } from '../api';

// One series per chart (no legend needed); orders and revenue get separate charts
// instead of a dual axis. Marks use a single brand hue; text stays in text colours.
const SERIES = '#eb6834';
const GRID = '#ECECEA';
const AXIS = { fontSize: 12, fill: '#6B7280' };

const inr = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const day = (d) => new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const STATUS_LABEL = { scheduled: 'Scheduled', placed: 'Placed', confirmed: 'Confirmed', preparing: 'Preparing', picked_up: 'Out for delivery', delivered: 'Delivered', cancelled: 'Cancelled' };

const Tile = ({ label, value, sub }) => (
  <div className="tile">
    <div className="tile-label">{label}</div>
    <div className="tile-value">{value}</div>
    {sub && <div className="tile-sub">{sub}</div>}
  </div>
);

const ChartCard = ({ title, children, table }) => {
  const [showTable, setShowTable] = useState(false);
  return (
    <section className="card">
      <div className="row between">
        <h3>{title}</h3>
        <button type="button" className="link small" onClick={() => setShowTable((s) => !s)}>{showTable ? 'Chart' : 'Table'}</button>
      </div>
      {showTable ? table : <div style={{ width: '100%', height: 240 }}>{children}</div>}
    </section>
  );
};

const SimpleTable = ({ rows, cols }) => (
  <table className="table">
    <thead><tr>{cols.map((c) => <th key={c.key}>{c.label}</th>)}</tr></thead>
    <tbody>{rows.map((r, i) => <tr key={i}>{cols.map((c) => <td key={c.key}>{c.fmt ? c.fmt(r[c.key]) : r[c.key]}</td>)}</tr>)}</tbody>
  </table>
);

const tooltipStyle = { borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13 };

const Dashboard = () => {
  const [days, setDays] = useState(14);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/admin/stats', { params: { days } }).then(({ data }) => setStats(data)).catch((e) => toast.error(errorMessage(e)));
  }, [days]);

  if (!stats) return <p className="muted">Loading dashboard…</p>;
  const t = stats.totals;
  const statusRows = stats.statusBreakdown.map((s) => ({ ...s, label: STATUS_LABEL[s.status] || s.status })).sort((a, b) => b.count - a.count);

  return (
    <div>
      <div className="row between wrap gap-12" style={{ marginBottom: 20 }}>
        <h2 className="title" style={{ margin: 0 }}>Dashboard</h2>
        <div className="segmented" role="group" aria-label="Date range">
          {[7, 14, 30].map((d) => (
            <button type="button" key={d} className={days === d ? 'active' : ''} onClick={() => setDays(d)}>{d} days</button>
          ))}
        </div>
      </div>

      <div className="tiles">
        <Tile label="Revenue (paid)" value={inr(t.revenue)} sub={`Avg order ${inr(t.avgOrderValue)}`} />
        <Tile label="Orders" value={t.orders} sub={`${t.delivered} delivered · ${t.cancelled} cancelled`} />
        <Tile label="Customers" value={t.customers} sub={`${t.restaurants} restaurants`} />
        <Tile label="Riders online" value={`${t.agents.online} / ${t.agents.total}`} sub={`${t.agents.busy} on a delivery`} />
      </div>

      <div className="grid-2">
        <ChartCard title="Orders per day" table={<SimpleTable rows={stats.daily} cols={[{ key: 'date', label: 'Date', fmt: day }, { key: 'orders', label: 'Orders' }]} />}>
          <ResponsiveContainer>
            <BarChart data={stats.daily} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="date" tickFormatter={day} tick={AXIS} axisLine={false} tickLine={false} minTickGap={16} />
              <YAxis allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
              <Tooltip labelFormatter={day} formatter={(v) => [v, 'Orders']} cursor={{ fill: 'rgba(0,0,0,0.04)' }} contentStyle={tooltipStyle} />
              <Bar dataKey="orders" fill={SERIES} radius={[4, 4, 0, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Revenue per day (paid)" table={<SimpleTable rows={stats.daily} cols={[{ key: 'date', label: 'Date', fmt: day }, { key: 'revenue', label: 'Revenue', fmt: inr }]} />}>
          <ResponsiveContainer>
            <LineChart data={stats.daily} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="date" tickFormatter={day} tick={AXIS} axisLine={false} tickLine={false} minTickGap={16} />
              <YAxis tickFormatter={(v) => `₹${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`} tick={AXIS} axisLine={false} tickLine={false} width={48} />
              <Tooltip labelFormatter={day} formatter={(v) => [inr(v), 'Revenue']} contentStyle={tooltipStyle} />
              <Line type="linear" dataKey="revenue" stroke={SERIES} strokeWidth={2} dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Orders by status" table={<SimpleTable rows={statusRows} cols={[{ key: 'label', label: 'Status' }, { key: 'count', label: 'Orders' }]} />}>
          <ResponsiveContainer>
            <BarChart data={statusRows} layout="vertical" margin={{ top: 4, right: 16, left: 24, bottom: 0 }}>
              <CartesianGrid horizontal={false} stroke={GRID} />
              <XAxis type="number" allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="label" tick={AXIS} axisLine={false} tickLine={false} width={110} />
              <Tooltip formatter={(v) => [v, 'Orders']} cursor={{ fill: 'rgba(0,0,0,0.04)' }} contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill={SERIES} radius={[0, 4, 4, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <section className="card">
          <h3>Top dishes</h3>
          {stats.topDishes.length === 0 ? <p className="muted">No orders yet.</p> : (
            <SimpleTable rows={stats.topDishes} cols={[{ key: 'name', label: 'Dish' }, { key: 'quantity', label: 'Sold' }, { key: 'revenue', label: 'Revenue', fmt: inr }]} />
          )}
          <h3 style={{ marginTop: 18 }}>Top restaurants</h3>
          {stats.topRestaurants.length === 0 ? <p className="muted">No orders yet.</p> : (
            <SimpleTable rows={stats.topRestaurants} cols={[{ key: 'name', label: 'Restaurant' }, { key: 'orders', label: 'Orders' }, { key: 'revenue', label: 'Revenue', fmt: inr }]} />
          )}
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
