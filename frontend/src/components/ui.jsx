// Small shared UI pieces.
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useT } from '../i18n';

export const Loader = () => {
  const { t } = useT();
  return (
    <div className="loader" role="status" aria-label={t('common.loading')}>
      <div className="spinner" />
    </div>
  );
};

export const EmptyState = ({ emoji, title, children }) => (
  <div className="empty-state">
    <div className="emoji" aria-hidden>{emoji}</div>
    <h3>{title}</h3>
    {children}
  </div>
);

export const Card = ({ title, children, className = '', ...rest }) => (
  <section className={`panel ${className}`} {...rest}>
    {title && <h3 className="panel-title">{title}</h3>}
    {children}
  </section>
);

export const VegMark = ({ veg }) => {
  const { t } = useT();
  const label = veg ? t('common.veg') : t('common.nonVeg');
  return <span className={`veg-mark ${veg ? 'veg' : 'nonveg'}`} title={label} aria-label={label} />;
};

export const FavButton = ({ restaurantId, className = '' }) => {
  const { isFavorite, toggleFavorite } = useAuth();
  const { t } = useT();
  const fav = isFavorite(restaurantId);
  return (
    <button
      type="button"
      className={`fav-btn ${fav ? 'on' : ''} ${className}`}
      aria-pressed={fav}
      aria-label={fav ? t('fav.remove') : t('fav.add')}
      title={fav ? t('fav.remove') : t('fav.add')}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(restaurantId);
      }}
    >
      {fav ? '❤️' : '🤍'}
    </button>
  );
};

export const Stars = ({ value = 0, onChange, size = '1.6rem' }) => {
  const { t } = useT();
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="stars" role={onChange ? 'radiogroup' : undefined} aria-label={t('review.rating')}>
      {[1, 2, 3, 4, 5].map((n) =>
        onChange ? (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={t('review.stars', { n })}
            style={{ fontSize: size }}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(n)}
          >
            {n <= shown ? '★' : '☆'}
          </button>
        ) : (
          <span key={n} style={{ fontSize: size }}>{n <= Math.round(shown) ? '★' : '☆'}</span>
        ),
      )}
    </div>
  );
};
