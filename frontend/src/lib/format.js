export const rupees = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

// Labels are translation keys (see src/i18n).
export const STATUS_STEPS = [
  { key: 'placed', emoji: '📋' },
  { key: 'confirmed', emoji: '✅' },
  { key: 'preparing', emoji: '👨‍🍳' },
  { key: 'picked_up', emoji: '🛵' },
  { key: 'delivered', emoji: '🎉' },
];

export const statusLabel = (s, t) => (s ? t(`status.${s}`) : '');
export const statusDesc = (s, t) => t(`status.${s}.desc`);

export const paymentLabel = (order, t) => {
  if (order.paymentStatus === 'refunded') return `↩️ ${t('pay.refunded')}`;
  if (order.paymentStatus === 'refund_pending') return `⏳ ${t('pay.refundPending')}`;
  if (order.paymentStatus === 'failed') return `❌ ${t('pay.failed')}`;
  if (order.paymentStatus === 'paid') return `✅ ${t('pay.paid')}`;
  return order.paymentMethod === 'cod' ? `💵 ${t('pay.onDelivery')}` : `⏳ ${t('pay.pending')}`;
};

export const shortId = (id) => `#${String(id).slice(-8).toUpperCase()}`;

export const formatDateTime = (d, locale = 'en-IN') =>
  new Date(d).toLocaleString(locale, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const formatSlot = (d, locale = 'en-IN') =>
  new Date(d).toLocaleString(locale, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export const FALLBACK_FOOD = 'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=300';
export const FALLBACK_RESTAURANT = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600';
