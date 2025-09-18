import { fetchAuthSession } from "aws-amplify/auth";

export interface StripeSubscription {
  id: string;
  status: string;
  current_period_start: number;
  current_period_end: number;
  trial_end?: number;
  cancel_at_period_end: boolean;
  items: {
    data: Array<{
      price: {
        id: string;
        nickname?: string;
        unit_amount: number;
        currency: string;
        recurring: {
          interval: string;
        };
      };
    }>;
  };
}

export interface StripeInvoice {
  id: string;
  created: number;
  amount_paid: number;
  currency: string;
  status: string;
  description?: string;
  hosted_invoice_url?: string;
  invoice_pdf?: string;
}

export interface StripePaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
}

export interface StripeBillingData {
  subscription: StripeSubscription | null;
  paymentMethod: StripePaymentMethod | null;
  invoices: StripeInvoice[];
  customerPortalUrl: string;
}

/**
 * Fetches billing data from Stripe for the authenticated user
 */
export async function fetchStripeBillingData(): Promise<StripeBillingData> {
  try {
    const session = await fetchAuthSession();
    const token = session.tokens?.idToken?.toString();

    if (!token) {
      throw new Error("User not authenticated");
    }

    const response = await fetch(
      "https://ukytl7ab7d.execute-api.us-west-2.amazonaws.com",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log({ response });
    if (!response.ok) {
      throw new Error(`Failed to fetch billing data: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching Stripe billing data:", error);
    throw error;
  }
}

/**
 * Creates a Stripe customer portal session for subscription management
 */
export async function createCustomerPortalSession(): Promise<{ url: string }> {
  try {
    const session = await fetchAuthSession();
    const token = session.tokens?.idToken?.toString();

    if (!token) {
      throw new Error("User not authenticated");
    }

    const response = await fetch(
      "https://your-api-endpoint.com/create-portal-session",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to create portal session: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error creating customer portal session:", error);
    throw error;
  }
}

/**
 * Helper function to format currency amounts
 */
export function formatCurrency(
  amount: number,
  currency: string = "usd"
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

/**
 * Helper function to format dates
 */
export const formatDate = (
  dateString: string | number | Date | undefined
): string => {
  if (!dateString) return "—";
  try {
    return new Date(dateString).toLocaleDateString("en-CA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
};

export const formatAmount = (
  amountTotal: number | null,
  amountDisplay: string | null,
  currency: string = "usd"
) => {
  // Use precomputed amount_display if present, else format cents
  if (amountDisplay) return amountDisplay;
  if (amountTotal == null) return "—";
  if (Number(amountTotal) === 0) return "Free";
  try {
    const value = Number(amountTotal) / 100;
    return value.toLocaleString(undefined, {
      style: "currency",
      currency: currency.toUpperCase(),
    });
  } catch {
    return `${(Number(amountTotal) / 100).toFixed(
      2
    )} ${currency.toUpperCase()}`;
  }
};

/**
 * Helper function to get plan name from price ID
 */
export function getPlanNameFromPriceId(priceId: string): string {
  const planMap: Record<string, string> = {
    [import.meta.env.VITE_STRIPE_BRONZE_PRICE_ID]: "Bronze",
    [import.meta.env.VITE_STRIPE_SILVER_PRICE_ID]: "Silver",
    [import.meta.env.VITE_STRIPE_GOLD_PRICE_ID]: "Gold",
  };

  return planMap[priceId] || "Unknown Plan";
}
