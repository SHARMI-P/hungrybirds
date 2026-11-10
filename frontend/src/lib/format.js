export const rupees = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export const STATUS_STEPS = [
  { key: 'placed', label: 'Order Placed', emoji: '📋', desc: 'We received your order!' },
  { key: 'confirmed', label: 'Order Confirmed', emoji: '✅', desc: 'Restaurant accepted your order' },
  { key: 'preparing', label: 'Preparing Food', emoji: '👨‍🍳', desc: 'Your food is being prepared' },
  { key: 'picked_up', label: 'Out for Delivery', emoji: '🛵', desc: 'Your rider is on the way' },
  { key: 'delivered', label: 'Delivered!', emoji: '🎉', desc: 'Enjoy your meal!' },
];

export const statusLabel = (s) =>
  ({ awaiting_payment: 'Awaiting payment', picked_up: 'Out for delivery' })[s] || (s ? s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ') : '');

export const paymentLabel = (order) => {
  if (order.paymentStatus === 'refunded') return '↩️ Refunded';
  if (order.paymentStatus === 'refund_pending') return '⏳ Refund in progress';
  if (order.paymentStatus === 'failed') return '❌ Payment failed';
  if (order.paymentStatus === 'paid') return '✅ Paid';
  return order.paymentMethod === 'cod' ? '💵 Pay on delivery' : '⏳ Payment pending';
};

export const shortId = (id) => `#${String(id).slice(-8).toUpperCase()}`;

export const formatDateTime = (d) =>
  new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const FALLBACK_FOOD = 'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=300';
export const FALLBACK_RESTAURANT = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600';
