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
