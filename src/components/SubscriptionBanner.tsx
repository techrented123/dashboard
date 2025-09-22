import React from "react";
import { AlertTriangle, X, Calendar } from "lucide-react";
import { useSubscription } from "../lib/context/subscriptionContext";
import { useNavigate } from "react-router-dom";

export default function SubscriptionBanner() {
  const { rawSubscription } = useSubscription();
  const navigate = useNavigate();
  const [isDismissed, setIsDismissed] = React.useState(false);

  // Show banner if user canceled but subscription remains active until a future date
  const isCanceledButActive =
    (rawSubscription?.status === "canceled" ||
      rawSubscription?.status === "trialing") &&
    rawSubscription?.cancel_at_period_end &&
    rawSubscription?.current_period_end &&
    new Date(rawSubscription.current_period_end) > new Date();
  console.log({ rawSubscription, isCanceledButActive });

  if (!isCanceledButActive || isDismissed) {
    return null;
  }

  const cancellationDate = rawSubscription?.current_period_end
    ? new Date(rawSubscription.current_period_end).toLocaleDateString()
    : "your subscription end date";

  const handleResumeSubscription = () => {
    navigate("/billing");
  };
  console.log({ rawSubscription, isCanceledButActive });
  return (
    <div className="fixed inset-x-0 top-16 z-50 flex justify-center px-3 sm:px-4">
      <div className="w-full max-w-[92%] sm:max-w-3xl rounded-xl border shadow-lg bg-yellow-100/95 dark:bg-slate-800/95 border-yellow-200 dark:border-slate-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 px-4 py-3">
          <div className="flex items-start sm:items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-700 dark:text-yellow-400 flex-shrink-0 mt-0.5 sm:mt-0" />
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm break-words">
              <span className="text-yellow-900 dark:text-yellow-200 font-medium">
                Your subscription has been canceled
              </span>
              <span className="hidden sm:inline text-yellow-800 dark:text-yellow-300">
                •
              </span>
              <span className="inline-flex items-center gap-1 text-yellow-800 dark:text-yellow-300">
                <Calendar className="w-4 h-4" /> Access ends on{" "}
                {cancellationDate}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handleResumeSubscription}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors w-full sm:w-auto"
            >
              Resume Subscription
            </button>
            <button
              onClick={() => setIsDismissed(true)}
              className="text-yellow-700 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-300 p-1"
              aria-label="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
