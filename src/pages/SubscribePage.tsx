import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, CreditCard, Loader2, CheckCircle2 } from "lucide-react";
import { fetchAuthSession } from "aws-amplify/auth";
import logo from "../assets/logo.png";
import ProtectedRoute from "../components/ProtectedRoute";

// Plan data - same as RegisterBillingPage
const PLANS = [
  {
    id: "gold",
    name: "Gold",
    price: "29.99",
    stripeId: import.meta.env.VITE_STRIPE_GOLD_PRICE_ID,
    features: [
      "Unlimited rent reports",
      "Priority customer support",
      "Advanced analytics",
      "Document storage",
    ],
  },
  {
    id: "silver",
    name: "Silver",
    price: "9.99",
    stripeId: import.meta.env.VITE_STRIPE_SILVER_PRICE_ID,
    features: [
      "Up to 5 rent reports per month",
      "Email support",
      "Basic analytics",
      "Document storage",
    ],
  },
  {
    id: "bronze",
    name: "Bronze",
    price: "4.99",
    stripeId: import.meta.env.VITE_STRIPE_BRONZE_PRICE_ID,
    features: [
      "Up to 2 rent reports per month",
      "Email support",
      "Basic features",
    ],
  },
];

// Plan card component
const PlanCard = ({
  plan,
  selected,
  onSelect,
}: {
  plan: any;
  selected: boolean;
  onSelect: (planId: string) => void;
}) => (
  <div
    onClick={() => onSelect(plan.id)}
    className={`p-6 border-2 rounded-xl cursor-pointer transition-all ${
      selected
        ? "border-secondary bg-secondary/5"
        : "border-slate-300 hover:border-slate-400"
    }`}
  >
    <div className="text-center">
      <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">
        {plan.name} Plan
      </h3>
      <div className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
        ${plan.price}
        <span className="text-sm font-normal text-slate-600 dark:text-slate-400">
          /month
        </span>
      </div>
      <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
        {plan.features.map((feature: string, index: number) => (
          <li key={index} className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
            {feature}
          </li>
        ))}
      </ul>
    </div>
  </div>
);

// Create checkout session function
async function createCheckoutSession(checkoutData: any) {
  try {
    const session = await fetchAuthSession();
    const token = session.tokens?.idToken?.toString();

    if (!token) {
      throw new Error("Authentication token not available");
    }

    const response = await fetch(
      "https://zwigvjvyub.execute-api.us-west-2.amazonaws.com/prod/create-checkout-session",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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

export default function SubscribePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedPlan, setSelectedPlan] = useState(PLANS[1]); // Default to Silver
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userInfo, setUserInfo] = useState<any>(null);

  // Get user info from Cognito
  useEffect(() => {
    const getUserInfo = async () => {
      try {
        const session = await fetchAuthSession();
        const userAttributes = session.tokens?.idToken?.payload;

        if (userAttributes) {
          setUserInfo({
            email: userAttributes.email,
            firstName: userAttributes.given_name,
            lastName: userAttributes.family_name,
            username: userAttributes.preferred_username || userAttributes.email,
          });
        }
      } catch (error) {
        console.error("Failed to get user info:", error);
      }
    };

    getUserInfo();
  }, []);

  const handlePlanSelect = (planId: string) => {
    const plan = PLANS.find((p) => p.id === planId);
    if (plan) {
      setSelectedPlan(plan);
    }
  };

  const handleSubscribe = async () => {
    if (!userInfo) {
      setError("User information not available. Please try logging in again.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const checkoutData = {
        priceId: selectedPlan.stripeId,
        customerEmail: userInfo.email,
        customerName: `${userInfo.firstName} ${userInfo.lastName}`,
        username: userInfo.username,
        successUrl: `${window.location.origin}/dashboard`,
        cancelUrl: `${window.location.origin}/subscribe`,
      };

      const checkoutResult = await createCheckoutSession(checkoutData);

      if (!checkoutResult.success) {
        throw new Error(
          checkoutResult.error || "Could not initiate payment session."
        );
      }

      // Redirect to Stripe Checkout
      window.location.href = checkoutResult.url;
    } catch (err: any) {
      console.error("Subscription process failed:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    // Go back to the page they came from, or dashboard if no referrer
    const from = location.state?.from?.pathname || "/dashboard";
    navigate(from);
  };

  return (
    <ProtectedRoute requireSubscription={false}>
      <main className="min-h-screen bg-gradient-to-b from-white to-primary-50 dark:from-slate-900 dark:to-slate-800 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {/* Logo */}
            <div className="text-center mb-8">
              <img src={logo} alt="Rented123 Logo" className="h-16 mx-auto" />
            </div>

            {/* Back button */}
            <div className="mb-6">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </button>
            </div>

            <div className="text-center mb-8">
              <h1 className="text-3xl font-semibold text-primary-800 dark:text-primary-300 mb-2">
                Choose Your Plan
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-400">
                Select a plan to continue using Rented123
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 xl:gap-16">
              {/* Plan Selection */}
              <div className="space-y-6">
                <div className="space-y-4">
                  {PLANS.map((plan) => (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      selected={selectedPlan.id === plan.id}
                      onSelect={handlePlanSelect}
                    />
                  ))}
                </div>
              </div>

              {/* Subscription Form */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-soft p-6 border dark:border-slate-700 h-fit">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-2">
                    Complete Subscription
                  </h2>
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-xl">
                    <span className="text-sm font-medium dark:text-slate-300">
                      Selected Plan:
                    </span>
                    <span className="text-sm font-bold text-secondary">
                      {selectedPlan.name} - ${selectedPlan.price}/month
                    </span>
                  </div>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl">
                    <p className="text-sm text-red-700 dark:text-red-400">
                      {error}
                    </p>
                  </div>
                )}

                {userInfo ? (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl">
                        <h3 className="font-medium text-blue-800 dark:text-blue-300 mb-2">
                          Ready to Subscribe
                        </h3>
                        <p className="text-sm text-blue-700 dark:text-blue-400">
                          You'll be redirected to Stripe for secure payment
                          processing.
                        </p>
                      </div>

                      <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                        <p>
                          <strong>Account:</strong> {userInfo.email}
                        </p>
                        <p>
                          <strong>Name:</strong> {userInfo.firstName}{" "}
                          {userInfo.lastName}
                        </p>
                      </div>

                      <button
                        onClick={handleSubscribe}
                        disabled={loading}
                        className="w-full bg-secondary text-white rounded-xl py-3 font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-4 h-4" />
                            Subscribe to {selectedPlan.name} Plan
                          </>
                        )}
                      </button>

                      <div className="text-center">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Secure checkout by Stripe • Cancel anytime
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-slate-600 dark:text-slate-400 mb-4">
                      Loading user information...
                    </p>
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}
