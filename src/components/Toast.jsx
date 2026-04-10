import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  };

  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  return { toasts, addToast, removeToast };
}

export function ToastContainer({ toasts, onRemove }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium
            ${t.type === 'success' ? 'bg-green-900/90 text-green-200 border border-green-700' :
              t.type === 'error' ? 'bg-red-900/90 text-red-200 border border-red-700' :
              'bg-[#1a1a1f] text-[#e8e8ee] border border-[#2a2a32]'}`}
        >
          {t.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          <span>{t.message}</span>
          <button onClick={() => onRemove(t.id)} className="ml-2 opacity-70 hover:opacity-100 min-h-[44px] min-w-[44px] flex items-center justify-center">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
