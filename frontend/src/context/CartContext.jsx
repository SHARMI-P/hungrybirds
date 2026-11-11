import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useT } from '../i18n';

const CartContext = createContext(null);
const KEY = 'hungrybirds_cart';
const EMPTY = { restaurantId: null, restaurantName: '', items: [] };

const load = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    return saved?.items ? saved : EMPTY;
  } catch {
    return EMPTY;
  }
};

// The cart stores what to display; prices shown here are only a preview.
// The real bill always comes from the server (/orders/quote).
export const CartProvider = ({ children }) => {
  const { t } = useT();
  const [cart, setCart] = useState(load);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(cart));
  }, [cart]);

  const addItem = (item, restaurantId, restaurantName) => {
    if (cart.restaurantId && cart.restaurantId !== restaurantId && cart.items.length > 0) {
       
      if (!window.confirm(t('cart.switchConfirm', { name: cart.restaurantName }))) return;
      setCart({ restaurantId, restaurantName, items: [{ ...pick(item), quantity: 1 }] });
      toast.success(t('cart.updated'));
      return;
    }
    setCart((prev) => {
      const exists = prev.items.find((i) => i._id === item._id);
      const items = exists
        ? prev.items.map((i) => (i._id === item._id ? { ...i, quantity: Math.min(i.quantity + 1, 50) } : i))
        : [...prev.items, { ...pick(item), quantity: 1 }];
      return { restaurantId, restaurantName, items };
    });
    if (!cart.items.some((i) => i._id === item._id)) toast.success(t('cart.added', { name: item.name }), { id: 'cart-add' });
  };

  const removeItem = (itemId) =>
    setCart((prev) => {
      const items = prev.items.map((i) => (i._id === itemId ? { ...i, quantity: i.quantity - 1 } : i)).filter((i) => i.quantity > 0);
      return items.length ? { ...prev, items } : EMPTY;
    });

  const dropItem = (itemId) =>
    setCart((prev) => {
      const items = prev.items.filter((i) => i._id !== itemId);
      return items.length ? { ...prev, items } : EMPTY;
    });

  const clearCart = () => setCart(EMPTY);

  // Used by "Reorder": swap the whole cart in one go.
  const replaceCart = (restaurantId, restaurantName, items) =>
    setCart({ restaurantId, restaurantName, items: items.map((i) => ({ ...pick(i), quantity: i.quantity })) });

  const getItemQuantity = (itemId) => cart.items.find((i) => i._id === itemId)?.quantity || 0;

  const value = useMemo(() => {
    const totalItems = cart.items.reduce((s, i) => s + i.quantity, 0);
    const subtotal = cart.items.reduce((s, i) => s + i.price * i.quantity, 0);
    const lines = cart.items.map((i) => ({ menuItemId: i._id, quantity: i.quantity }));
    return { cart, lines, totalItems, subtotal, addItem, removeItem, dropItem, clearCart, replaceCart, getItemQuantity };
  }, [cart, t]); // eslint-disable-line react-hooks/exhaustive-deps

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

const pick = ({ _id, name, price, image, isVeg }) => ({ _id, name, price, image, isVeg });

// eslint-disable-next-line react-refresh/only-export-components
export const useCart = () => useContext(CartContext);
