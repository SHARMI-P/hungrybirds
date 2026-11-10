// Small shared UI pieces.
import { useState } from 'react';

export const Loader = ({ label = 'Loading…' }) => (
  <div className="loader" role="status" aria-label={label}>
    <div className="spinner" />
  </div>
);

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

export const VegMark = ({ veg }) => (
  <span className={`veg-mark ${veg ? 'veg' : 'nonveg'}`} title={veg ? 'Vegetarian' : 'Non-vegetarian'} aria-label={veg ? 'Vegetarian' : 'Non-vegetarian'} />
);

export const Stars = ({ value = 0, onChange, size = '1.6rem' }) => {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="stars" role={onChange ? 'radiogroup' : undefined} aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) =>
        onChange ? (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
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
