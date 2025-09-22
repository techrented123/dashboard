import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { fetchAuthSession } from "aws-amplify/auth";

type SubscriptionStatus = "active" | "trialing" | "inactive" | "unknown";

interface SubscriptionState {
  status: SubscriptionStatus;
  lastCheckedAt: number | null;
  rawSubscription?: {
    status: string;
    cancel_at_period_end?: boolean;
    current_period_end?: string;
    cancel_at?: string;
  };
}

interface SubscriptionContextValue extends SubscriptionState {
  refresh: (opts?: { force?: boolean }) => Promise<SubscriptionState>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(
  null
);

const STORAGE_KEY = "subscriptionStatusCache_v1";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function fetchBillingStatus(): Promise<SubscriptionState> {
  try {
    const session = await fetchAuthSession();
    const token = session.tokens?.idToken?.toString();
    if (!token) return { status: "unknown", lastCheckedAt: Date.now() };

    const baseUrl =
      import.meta.env.VITE_BILLING_API_BASE_URL ||
      "https://ukytl7ab7d.execute-api.us-west-2.amazonaws.com/prod/";

    const response = await fetch(baseUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return { status: "unknown", lastCheckedAt: Date.now() };
    }

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return { status: "unknown", lastCheckedAt: Date.now() };
    }

    const data = await response.json();
    const rawStatus: string | undefined = data?.subscription?.status;
    const subscription = data?.subscription;

    let status: SubscriptionStatus;
    if (rawStatus === "active" || rawStatus === "trialing") {
      status = rawStatus as SubscriptionStatus;
    } else if (
      rawStatus === "canceled" &&
      subscription?.cancel_at_period_end &&
      subscription?.current_period_end &&
      new Date(subscription.current_period_end) > new Date()
    ) {
      // User canceled but still has access until period end
      status = "active";
    } else {
      status = "inactive";
    }

    return {
      status,
      lastCheckedAt: Date.now(),
      rawSubscription: subscription,
    };
  } catch {
    return { status: "unknown", lastCheckedAt: Date.now() };
  }
}

function readCache(): SubscriptionState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SubscriptionState;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(state: SubscriptionState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export function SubscriptionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const initial = useMemo<SubscriptionState>(
    () =>
      readCache() || {
        status: "unknown",
        lastCheckedAt: null,
        rawSubscription: undefined,
      },
    []
  );
  const [state, setState] = useState<SubscriptionState>(initial);
  const isRefreshingRef = useRef(false);

  const refresh = useCallback(
    async ({ force = false }: { force?: boolean } = {}) => {
      if (isRefreshingRef.current) return state; // prevent parallel refreshes

      const now = Date.now();
      const isStale =
        !state.lastCheckedAt || now - state.lastCheckedAt > CACHE_TTL_MS;
      if (!force && !isStale) return state;

      isRefreshingRef.current = true;
      const next = await fetchBillingStatus();
      isRefreshingRef.current = false;
      setState(next);
      writeCache(next);
      return next;
    },
    [state]
  );

  // On mount (after login), refresh in background without blocking UI
  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<SubscriptionContextValue>(
    () => ({ ...state, refresh }),
    [state, refresh]
  );
  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription(): SubscriptionContextValue {
  const ctx = useContext(SubscriptionContext);
  if (!ctx)
    throw new Error("useSubscription must be used within SubscriptionProvider");
  return ctx;
}

// Helper for premium actions: ensure fresh status and return boolean
export async function ensurePremiumAccess(
  refreshFn: SubscriptionContextValue["refresh"],
  lastCheckedAt: number | null,
  status: SubscriptionStatus
): Promise<boolean> {
  const now = Date.now();
  const isStale = !lastCheckedAt || now - lastCheckedAt > CACHE_TTL_MS;
  let effectiveStatus = status;
  if (isStale || status === "unknown") {
    const next = await refreshFn({ force: true });
    effectiveStatus = next.status;
  }
  return effectiveStatus === "active" || effectiveStatus === "trialing";
}
