import { ExternalLink, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { POLYGONSCAN_TX } from '../config/constants';
import { useState, useEffect, useCallback } from 'react';

interface ToastData {
  id: string;
  type: 'pending' | 'success' | 'error';
  title: string;
  message?: string;
  txHash?: string;
}

let toastListeners: ((toasts: ToastData[]) => void)[] = [];
let currentToasts: ToastData[] = [];

function updateToasts(toasts: ToastData[]) {
  currentToasts = toasts;
  toastListeners.forEach((l) => l(toasts));
}

export function addToast(toast: Omit<ToastData, 'id'>) {
  const id = Math.random().toString(36).slice(2);
  updateToasts([...currentToasts, { ...toast, id }]);
  if (toast.type !== 'pending') {
    setTimeout(() => removeToast(id), 6000);
  }
  return id;
}

export function removeToast(id: string) {
  updateToasts(currentToasts.filter((t) => t.id !== id));
}

export function updateToast(id: string, update: Partial<ToastData>) {
  updateToasts(currentToasts.map((t) => (t.id === id ? { ...t, ...update } : t)));
  if (update.type && update.type !== 'pending') {
    setTimeout(() => removeToast(id), 6000);
  }
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  useEffect(() => {
    toastListeners.push(setToasts);
    return () => {
      toastListeners = toastListeners.filter((l) => l !== setToasts);
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.95 }}
            className="glass-card p-3 flex items-start gap-3 cursor-pointer"
            onClick={() => removeToast(toast.id)}
          >
            {toast.type === 'pending' && (
              <Loader2 className="w-4 h-4 text-accent animate-spin shrink-0 mt-0.5" />
            )}
            {toast.type === 'success' && (
              <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
            )}
            {toast.type === 'error' && (
              <XCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-neutral-200 truncate">{toast.title}</p>
              {toast.message && (
                <p className="text-[11px] text-neutral-500 mt-0.5 truncate">{toast.message}</p>
              )}
              {toast.txHash && (
                <a
                  href={POLYGONSCAN_TX(toast.txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-accent hover:text-accent-300 mt-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  View on Polygonscan
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
