import { describe, expect, test, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { CartProvider, useCart } from '../context/CartContext';

vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

const wrapper = ({ children }) => <CartProvider>{children}</CartProvider>;
const dosa = { _id: 'm1', name: 'Dosa', price: 60, isVeg: true, image: '' };
const coffee = { _id: 'm2', name: 'Coffee', price: 30, isVeg: true, image: '' };

describe('CartContext', () => {
  test('adds, increments and sends only ids + quantities to the server', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem(dosa, 'r1', 'Bhavan'));
    act(() => result.current.addItem(dosa, 'r1', 'Bhavan'));
    act(() => result.current.addItem(coffee, 'r1', 'Bhavan'));
    expect(result.current.totalItems).toBe(3);
    expect(result.current.subtotal).toBe(150);
    expect(result.current.lines).toEqual([{ menuItemId: 'm1', quantity: 2 }, { menuItemId: 'm2', quantity: 1 }]);
  });

  test('switching restaurants asks first and keeps the cart if declined', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem(dosa, 'r1', 'Bhavan'));
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false);
    act(() => result.current.addItem(coffee, 'r2', 'Cafe'));
    expect(result.current.cart.restaurantId).toBe('r1');
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);
    act(() => result.current.addItem(coffee, 'r2', 'Cafe'));
    expect(result.current.cart.restaurantId).toBe('r2');
    expect(result.current.totalItems).toBe(1);
  });

  test('removing the last item empties the cart; reorder replaces it', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem(dosa, 'r1', 'Bhavan'));
    act(() => result.current.removeItem('m1'));
    expect(result.current.cart.restaurantId).toBeNull();
    act(() => result.current.replaceCart('r9', 'Old Favourite', [{ ...coffee, quantity: 4 }]));
    expect(result.current.cart).toMatchObject({ restaurantId: 'r9', restaurantName: 'Old Favourite' });
    expect(result.current.totalItems).toBe(4);
  });

  test('survives corrupted localStorage', () => {
    localStorage.setItem('hungrybirds_cart', '{not json');
    const { result } = renderHook(() => useCart(), { wrapper });
    expect(result.current.totalItems).toBe(0);
  });
});
