import { AlertTriangle } from "lucide-react";

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  isLoading?: boolean;
}

export default function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmButtonText = "Confirm",
  cancelButtonText = "Cancel",
  isLoading = false,
}: ConfirmationDialogProps) {
  if (!isOpen) {
    return <></>;
  }

  return (
    // Main overlay
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60"
      onClick={onClose} // Close dialog when clicking the overlay
    >
      {/* Dialog box */}
      <div
        className="relative w-full max-w-md p-6 m-4 bg-white rounded-2xl shadow-lg dark:bg-slate-800"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the dialog
      >
        <div className="flex items-start">
          {/* Icon */}
          <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full dark:bg-red-900/30 sm:mx-0 sm:w-10 sm:h-10">
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>

          <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
            {/* Title */}
            <h3
              className="text-lg font-semibold leading-6 text-slate-900 dark:text-slate-100"
              id="modal-title"
            >
              {title}
            </h3>
            {/* Message */}
            <div className="mt-2">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {message}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
          <button
            type="button"
            disabled={isLoading}
            className="inline-flex justify-center w-full px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg shadow-sm hover:bg-red-700 sm:ml-3 sm:w-auto disabled:opacity-50"
            onClick={onConfirm}
          >
            {isLoading ? "Deleting..." : confirmButtonText}
          </button>
          <button
            type="button"
            className="inline-flex justify-center w-full px-4 py-2 mt-3 text-sm font-semibold text-slate-900 bg-white rounded-lg shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 dark:bg-slate-700 dark:text-slate-200 dark:ring-slate-600 dark:hover:bg-slate-600 sm:mt-0 sm:w-auto"
            onClick={onClose}
          >
            {cancelButtonText}
          </button>
        </div>
      </div>
    </div>
  );
}
