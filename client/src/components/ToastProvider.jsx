import React, { useEffect, useState } from 'react';

export function notify(message, type = 'info') {
  window.dispatchEvent(new CustomEvent('app-toast', { detail: { message, type } }));
}

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleToast = (event) => {
      const toast = {
        id: `${Date.now()}-${Math.random()}`,
        message: event.detail?.message || 'Something happened.',
        type: event.detail?.type || 'info',
      };

      setToasts((current) => [...current, toast]);
      window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== toast.id));
      }, 4500);
    };

    window.addEventListener('app-toast', handleToast);
    return () => window.removeEventListener('app-toast', handleToast);
  }, []);

  const tone = {
    success: 'border-green-500 bg-green-50 text-green-900',
    error: 'border-red-500 bg-red-50 text-red-900',
    info: 'border-blue-500 bg-blue-50 text-blue-900',
  };

  return (
    <>
      {children}
      <div className="toast-stack" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast-card ${tone[toast.type] || tone.info}`} role="status">
            <span className="toast-dot" aria-hidden="true" />
            <p>{toast.message}</p>
            <button type="button" onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))} aria-label="Dismiss notification">
              &times;
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

export default ToastProvider;