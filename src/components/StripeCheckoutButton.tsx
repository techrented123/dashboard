import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { createCheckoutSession } from "../lib/stripe";
import { Plan } from "../types/plans";

interface StripeCheckoutButtonProps {
  plan: Plan;
  customerEmail: string;
  customerName: string;
  userId: string;
  disabled?: boolean;
}

export default function StripeCheckoutButton({
  plan,
  customerEmail,
  customerName,
  userId,
  disabled = false,
}: StripeCheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCheckout = async () => {
    setLoading(true);
    setError("");

    try {
      const checkoutData = {
        priceId: plan.stripeId,
        customerEmail,
        customerName,
        userId,
        successUrl: `${window.location.origin}/register/confirm?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${window.location.origin}/register/billing`,
      };

      const result = await createCheckoutSession(checkoutData);

      if (result.success) {
        // Redirect directly to Stripe Checkout URL
        window.location.href = result.url;
      } else {
        setError(result.error || "Failed to create checkout session");
      }
    } catch (error: any) {
      setError(error.message || "Something went wrong");
    }

    setLoading(false);
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      <button
        onClick={handleCheckout}
        disabled={disabled || loading}
        className="w-full bg-secondary text-white rounded-xl py-3 font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Creating checkout session...
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4" />
            Start 2-Month Free Trial - ${plan.price}/month after
          </>
        )}
      </button>

      <div className="text-center">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          🎉 No charge for 60 days • Cancel anytime • Secure checkout by Stripe
        </p>
      </div>
    </div>
  );
}
