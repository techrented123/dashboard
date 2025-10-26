import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { PRODUCTS } from "../types/products";
import { Button } from "../components/ui/button";
import { ArrowLeft, CreditCard, CheckCircle2, Crown } from "lucide-react";

export default function BackRentReportingPublicPurchasePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Use products[1] for public purchase (non-member pricing)
  const product = PRODUCTS[1];

  const getAuthToken = async () => {
    try {
      const { fetchAuthSession } = await import("aws-amplify/auth");
      const session = await fetchAuthSession();
      return session.tokens?.idToken?.toString() || "";
    } catch (error) {
      console.error("Error getting auth token:", error);
      return "";
    }
  };

  const handlePurchase = async () => {
    setLoading(true);
    setError("");

    try {
      // Check if user is logged in
      const token = await getAuthToken();

      if (!token) {
        // User not logged in, redirect to login
        navigate("/login", {
          state: {
            from: location.pathname,
            returnTo: "/public-purchase/back-rent-report",
          },
        });
        setLoading(false);
        return;
      }

      // Get user info
      const { user } = await import("../lib/context/authContext").then((m) =>
        m.useAuth()
      );

      if (!user) {
        setError("User information not available");
        setLoading(false);
        return;
      }

      // Create checkout session with public price
      const checkoutData = {
        priceId: product.stripePriceId,
        customerEmail: user.email || "",
        customerName: `${user.given_name || ""} ${
          user.family_name || ""
        }`.trim(),
        successUrl: `${window.location.origin}/public-form/back-rent-report?purchased=true`,
        cancelUrl: `${window.location.origin}/public-purchase/back-rent-report`,
        metadata: {
          userId: user.sub,
          productId: "prod_TGyn4MgtPcaDTr",
          purchaseType: "public",
        },
      };

      const response = await fetch(
        "https://efa9t5n79c.execute-api.us-west-2.amazonaws.com/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(checkoutData),
        }
      );

      const result = await response.json();

      if (result.success) {
        window.location.href = result.url;
      } else {
        setError(result.error || "Failed to create checkout session");
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setLoading(false);
    }
  };

  const handleBack = () => {
    const from = location.state?.from?.pathname || "/";
    navigate(from);
  };

  const handleSubscribe = () => {
    navigate("/subscribe");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Back Button */}
          <button
            onClick={handleBack}
            className="flex items-center text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </button>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              {product.name}
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              {product.description}
            </p>
          </div>

          {/* Member Discount Banner */}
          <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-start gap-3">
              <Crown className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-green-800 dark:text-green-200 mb-1">
                  Become a member for just $9.99/month and get 50% OFF!
                </h3>
                <p className="text-sm text-green-700 dark:text-green-300 mb-2">
                  Pay only $49.99 instead of $99.99 when you subscribe to our
                  membership plan.
                </p>
                <Button
                  onClick={handleSubscribe}
                  variant="outline"
                  size="sm"
                  className="text-green-800 dark:text-green-200 border-green-300 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900/30"
                >
                  Subscribe Now
                </Button>
              </div>
            </div>
          </div>

          {/* Product Card */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-soft border dark:border-slate-700 p-6">
            <h2 className="text-xl font-bold mb-6 text-slate-900 dark:text-slate-100">
              Product Details
            </h2>

            <div className="space-y-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary-600 dark:text-primary-400 mb-2">
                  ${product.price}
                </div>
                <div className="text-slate-600 dark:text-slate-400">
                  One-time payment
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3 text-slate-900 dark:text-slate-100">
                  What's included:
                </h3>
                <ul className="space-y-2">
                  {product.features.map((feature, index) => (
                    <li
                      key={index}
                      className="flex items-center text-slate-700 dark:text-slate-300"
                    >
                      <CheckCircle2 className="text-green-500 mr-2 w-5 h-5" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <p className="text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              <Button
                onClick={handlePurchase}
                disabled={loading}
                className="w-full text-white bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                {loading ? (
                  <>
                    <div className="text-white animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Purchase for ${product.price}
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
            <p>Secure payment powered by Stripe</p>
            <p>You'll be redirected to complete your purchase</p>
          </div>
        </div>
      </div>
    </div>
  );
}
