import { useEffect } from 'react';
import { cn } from '../../utils/cn';

interface ToastProps {
  message: string;
  type?: 'error' | 'success';
  onClose: () => void;
}

export function Toast({ message, type = 'error', onClose }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium text-white max-w-sm',
        type === 'error' ? 'bg-red-600' : 'bg-green-600'
      )}
    >
      <span className="flex-1">{message}</span>
      <button onClick={onClose} className="text-white/70 hover:text-white flex-shrink-0">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
