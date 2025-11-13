import { loadStripe } from "@stripe/stripe-js";
import { fetchAuthSession } from "aws-amplify/auth";

// Initialize Stripe with your publishable key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY!);

export interface CheckoutSessionData {
  priceId: string;
  customerEmail: string;
  customerName: string;
  userId: string;
  successUrl: string;
  cancelUrl: string;
}

export async function createCheckoutSession(checkoutData: CheckoutSessionData) {
  try {
    // Try to get authentication token if user is signed in, but don't require it
    let authHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };

    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      if (token) {
        authHeaders["Authorization"] = `Bearer ${token}`;
        console.log("Including authentication token in checkout request");
      } else {
        console.log(
          "No authentication token available - proceeding with registration flow"
        );
      }
    } catch (authError) {
      console.log("User not authenticated - proceeding with registration flow");
    }

    const response = await fetch(
      "https://zwigvjvyub.execute-api.us-west-2.amazonaws.com/prod/create-checkout-session",
      {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(checkoutData),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to create checkout session");
    }

    return { success: true, ...(await response.json()) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function redirectToCheckout(sessionId: string) {
  const stripe = await stripePromise;

  if (!stripe) {
    throw new Error("Stripe failed to load");
  }

  const { error } = await stripe.redirectToCheckout({
    sessionId: sessionId,
  });

  if (error) {
    throw error;
  }
}

// ID Verification-only checkout creator (anonymous; no auth; minimal payload)
export async function createIdVerificationCheckoutSession(from: string) {
  try {
    const origin = window.location.origin;
    const priceId = (import.meta as any).env
      ?.VITE_STRIPE_ID_VERIFICATION_PRICE_ID;
    if (!priceId) {
      throw new Error("Missing VITE_STRIPE_ID_VERIFICATION_PRICE_ID");
    }

    const checkoutData = {
      priceId,
      successUrl: `${origin}/id-verification/process`,
      cancelUrl: `${origin}/id-verification/purchase?from=${encodeURIComponent(
        from
      )}`,
      metadata: { productId: "id-verification" },
    };

    const response = await fetch(
      "https://leeuzck5cd.execute-api.us-west-2.amazonaws.com/create-checkout-session",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" }, // No Authorization header
        body: JSON.stringify(checkoutData),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to create checkout session");
    }

    return { success: true, ...(await response.json()) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
