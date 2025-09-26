import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSubscription } from "../lib/context/subscriptionContext";

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

export default function SubscriptionGuard({
  children,
}: SubscriptionGuardProps) {
  const location = useLocation();
  const { status, refresh } = useSubscription();

  useEffect(() => {
    // Trigger a background refresh on route change, but do not block UI
    void refresh();
  }, [location.pathname, refresh]);

  // Allow subscription-related pages unconditionally
  const subscriptionPages = ["/subscribe", "/register/billing"];
  const isOnSubscriptionPage = subscriptionPages.some((page) =>
    location.pathname.startsWith(page)
  );
  if (isOnSubscriptionPage) return <>{children}</>;

  // Only redirect if status is definitively inactive; wait for unknown status to be resolved
  if (status === "inactive") {
    return <Navigate to="/subscribe" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
