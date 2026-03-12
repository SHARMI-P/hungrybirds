import { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('hungrybirds_cart');
    return saved ? JSON.parse(saved) : { restaurantId: null, restaurantName: '', items: [] };
  });

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('hungrybirds_cart', JSON.stringify(cart));
  }, [cart]);

  const addItem = (item, restaurantId, restaurantName) => {
    // If adding from a different restaurant, confirm clear
    if (cart.restaurantId && cart.restaurantId !== restaurantId && cart.items.length > 0) {
      const confirm = window.confirm(
        'Your cart has items from another restaurant. Clear cart and add this item?'
      );
      if (!confirm) return;
      // Clear and add
      setCart({
        restaurantId,
        restaurantName,
        items: [{ ...item, quantity: 1 }],
      });
      toast.success('Cart updated!');
      return;
    }

    setCart((prev) => {
      const exists = prev.items.find((i) => i._id === item._id);
      if (exists) {
        return {
          ...prev,
          items: prev.items.map((i) =>
            i._id === item._id ? { ...i, quantity: i.quantity + 1 } : i
          ),
        };
      }
      return {
        restaurantId,
        restaurantName,
        items: [...prev.items, { ...item, quantity: 1 }],
      };
    });
    toast.success(`${item.name} added to cart 🛒`);
  };

  const removeItem = (itemId) => {
    setCart((prev) => {
      const updated = prev.items
        .map((i) => (i._id === itemId ? { ...i, quantity: i.quantity - 1 } : i))
        .filter((i) => i.quantity > 0);
      return { ...prev, items: updated };
    });
  };

  const clearCart = () => {
    setCart({ restaurantId: null, restaurantName: '', items: [] });
  };

  const getItemQuantity = (itemId) => {
    const item = cart.items.find((i) => i._id === itemId);
    return item ? item.quantity : 0;
  };

  const totalItems = cart.items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal   = cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ cart, addItem, removeItem, clearCart, getItemQuantity, totalItems, subtotal }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
