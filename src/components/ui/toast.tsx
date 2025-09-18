"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, X } from "lucide-react";

interface ToastProps {
  message: string;
  type: "success" | "error";
  isVisible: boolean;
  onClose: () => void;
}

export function Toast({ message, type, isVisible, onClose }: ToastProps) {
  React.useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 4000); // Auto-close after 4 seconds

      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-[10000] w-auto max-w-sm">
      <div
        className={cn(
          "flex items-start gap-3 p-4 rounded-lg shadow-lg border bg-white transform transition-all duration-300 ease-in-out",
          isVisible
            ? "scale-100 opacity-100 translate-x-0"
            : "scale-95 opacity-0 translate-x-full"
        )}
      >
        <div className="flex-shrink-0">
          {type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          ) : (
            <X className="w-5 h-5 text-red-600" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900">
            {type === "success" ? "Success" : "Error"}
          </div>
          <div className="text-sm text-gray-500 mt-1">{message}</div>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
