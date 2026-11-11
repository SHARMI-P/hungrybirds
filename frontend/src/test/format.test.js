import { describe, expect, test } from 'vitest';
import { paymentLabel, rupees, shortId, statusLabel } from '../lib/format';
import { haversineKm, pointToLatLng } from '../lib/geo';
import { errorMessage } from '../api';
import en from '../i18n/en';
import kn from '../i18n/kn';

const tFor = (dict) => (key, vars) => (dict[key] ?? en[key] ?? key).replace(/\{(\w+)\}/g, (_, k) => vars?.[k] ?? '');

describe('helpers', () => {
  test('formatting', () => {
    expect(rupees(1234.5)).toBe('₹1,234.5');
    expect(statusLabel('picked_up', tFor(en))).toBe('Out for Delivery');
    expect(statusLabel('picked_up', tFor(kn))).toBe('ಡೆಲಿವರಿಗೆ ಹೊರಟಿದೆ');
    expect(shortId('65f1c2e4a1b2c3d4e5f60718')).toBe('#E5F60718');
    expect(paymentLabel({ paymentMethod: 'cod', paymentStatus: 'pending' }, tFor(en))).toMatch(/Pay on delivery/);
  });

  test('every status has a label in both languages', () => {
    for (const s of ['awaiting_payment', 'scheduled', 'placed', 'confirmed', 'preparing', 'picked_up', 'delivered', 'cancelled']) {
      expect(en[`status.${s}`]).toBeTruthy();
      expect(kn[`status.${s}`]).toBeTruthy();
    }
  });

  test('Kannada placeholders match English ones', () => {
    for (const [key, text] of Object.entries(kn)) {
      const vars = (s) => (s.match(/\{\w+\}/g) || []).sort().join();
      expect([key, vars(text)]).toEqual([key, vars(en[key])]);
    }
  });

  test('geo', () => {
    expect(pointToLatLng({ coordinates: [75, 15] })).toEqual({ lat: 15, lng: 75 });
    const km = haversineKm({ lat: 15.4589, lng: 75.0078 }, { lat: 15.3647, lng: 75.124 });
    expect(km).toBeGreaterThan(15);
    expect(km).toBeLessThan(17);
  });

  test('errorMessage prefers field errors', () => {
    const err = { response: { data: { message: 'Validation failed', errors: [{ field: 'phone', message: 'Bad phone' }] } } };
    expect(errorMessage(err)).toBe('Bad phone');
    expect(errorMessage({ message: 'Network Error' })).toMatch(/Cannot reach the server/);
  });
});
