let loading: Promise<void> | null = null;

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

// Lazy-load Razorpay checkout script only when user clicks Pay
export function loadRazorpayCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  if (loading) return loading;

  loading = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve();
    script.onerror = () => {
      loading = null;
      reject(new Error('Failed to load Razorpay'));
    };
    document.body.appendChild(script);
  });

  return loading;
}
