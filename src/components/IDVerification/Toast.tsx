"use client";
import React, { useEffect } from "react";
import { CheckCircle, X } from "lucide-react";

interface ToastProps {
  message: string;
  onClose: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({ message, onClose, duration = 3000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
      <div className="bg-green-600 text-white px-6 py-4 rounded-lg shadow-lg flex items-center space-x-3 min-w-[300px] max-w-md">
        <div className="flex-shrink-0">
          <CheckCircle className="w-6 h-6" />
        </div>
        <p className="flex-1 text-sm font-medium">{message}</p>
        <button
          onClick={onClose}
          className="flex-shrink-0 hover:bg-green-700 rounded-full p-1 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <style jsx>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default Toast;
