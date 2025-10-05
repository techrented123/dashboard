import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAuthSession } from "aws-amplify/auth";

// Interface for billing data
export interface BillingData {
  subscription: {
    plan_name: string;
    status: string;
    current_period_end: string;
    cancel_at_period_end?: boolean;
    cancel_at?: string;
    default_payment_method?: any;
  };
  payment_method?: {
    brand: string;
    last4: string;
  };
  savedPaymentMethods?: any[];
  invoices?: any[];
  manageSubscriptionUrl?: string;
}

// Function to fetch billing data from API
async function fetchBillingData(): Promise<BillingData> {
  const session = await fetchAuthSession();
  const token = session.tokens?.idToken?.toString();
  if (!token) {
    throw new Error("User not authenticated");
  }

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
  console.log({ response });
  if (!response.ok) {
    // Check if response is HTML (error page)
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("text/html")) {
      throw new Error(
        `Server returned HTML error page (${response.status}). Please check your API endpoint.`
      );
    }
    throw new Error(`Failed to fetch billing data: ${response.status}`);
  }

  // Check if response is JSON
  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    throw new Error(
      "Server returned non-JSON response. Please check your API endpoint."
    );
  }

  const data = await response.json();
  return data;
}

// Hook for fetching billing data with TanStack Query
export const useBillingData = () => {
  return useQuery({
    queryKey: ["billing"],
    queryFn: fetchBillingData,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 60 minutes
    retry: (failureCount, error) => {
      // Don't retry on auth errors
      if (error instanceof Error && error.message.includes("401")) return false;
      if (error instanceof Error && error.message.includes("403")) return false;
      return failureCount < 2;
    },
  });
};

// Hook for managing subscription with cache invalidation
export const useManageSubscription = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();

      if (!token) {
        throw new Error("User not authenticated");
      }

      // Use the manageSubscriptionUrl from billing data instead of making a separate API call
      const billingData = queryClient.getQueryData(["billing"]) as BillingData;
      if (!billingData?.manageSubscriptionUrl) {
        throw new Error("No subscription management URL available");
      }

      // Simply return the URL - the frontend will redirect to it
      return { url: billingData.manageSubscriptionUrl };
    },
    onSuccess: () => {
      // Invalidate and refetch billing data
      queryClient.invalidateQueries({ queryKey: ["billing"] });
    },
  });
};
