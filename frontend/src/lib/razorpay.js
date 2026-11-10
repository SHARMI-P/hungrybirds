// Load Razorpay Checkout only when the customer actually pays online.
let loading;

export const loadRazorpay = () => {
  if (window.Razorpay) return Promise.resolve(true);
  if (!loading) {
    loading = new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.onload = () => resolve(true);
      s.onerror = () => {
        loading = undefined;
        resolve(false);
      };
      document.body.appendChild(s);
    });
  }
  return loading;
};
