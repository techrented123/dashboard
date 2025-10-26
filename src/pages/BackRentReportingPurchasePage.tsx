import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/context/authContext";
import { fetchAuthSession } from "aws-amplify/auth";
import { PRODUCTS } from "../types/products";
import Card from "../components/Card";
import { Button } from "../components/ui/button";
import { ArrowLeft, CreditCard, CheckCircle2 } from "lucide-react";

export default function BackRentReportingPurchasePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [error, setError] = useState("");

  const product = PRODUCTS.find((p) => p.id === "prod_TGyn4MgtPcaDTr");

  const getAuthToken = async () => {
    try {
      const session = await fetchAuthSession();
      return session.tokens?.idToken?.toString() || "";
    } catch (error) {
      console.error("Error getting auth token:", error);
      return "";
    }
  };

  // Check if user already has access to the product
  const checkUserAccess = async () => {
    console.log("🎯 checkUserAccess function called");

    try {
      const token = await getAuthToken();
      if (!token) {
        console.log("❌ No authentication token available");
        setError("Authentication required");
        setCheckingAccess(false);
        return;
      }

      // Check purchases API for back rent reporting purchases
      const purchasesApiUrl = import.meta.env.DEV
        ? "/api/purchases"
        : "https://i26qdmcyv5.execute-api.us-west-2.amazonaws.com";

      console.log("🌐 Calling purchases API:", purchasesApiUrl);

      const response = await fetch(`${purchasesApiUrl}/${user?.sub}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("📡 API Response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("📊 API Response data:", data);

        const purchases = data.purchases || [];
        console.log("🛒 All purchases:", purchases);

        // Check if user has UNREPORTED back rent reporting purchases
        const unreportedPurchases = purchases.filter((purchase: any) => {
          const isBackRentProduct = purchase.product === "back-rent-report";
          const isCurrentUser = purchase.userId === user?.sub;
          const isUnreported =
            purchase.reported === false || !purchase.reported;

          console.log(`🔍 Checking purchase:`, {
            product: purchase.product,
            userId: purchase.userId,
            reported: purchase.reported,
            isBackRentProduct,
            isCurrentUser,
            isUnreported,
            matches: isBackRentProduct && isCurrentUser && isUnreported,
          });

          return isBackRentProduct && isCurrentUser && isUnreported;
        });

        console.log(
          "✅ Has unreported purchases:",
          unreportedPurchases.length > 0
        );
        console.log(
          "📊 Unreported purchases count:",
          unreportedPurchases.length
        );

        if (unreportedPurchases.length > 0) {
          // User has unreported purchases, redirect to form
          console.log("🎉 User has unreported purchases, redirecting to form");
          navigate("/back-rent-reporting");
          return;
        } else {
          console.log(
            "💳 User has no unreported purchases, showing purchase page"
          );
        }
      } else {
        console.log(
          "❌ Purchases API not available, proceeding to purchase page"
        );
        console.log("📡 Response status:", response.status);
        console.log("📡 Response text:", await response.text());
      }

      // User hasn't purchased or has no unreported purchases, show purchase page
      setCheckingAccess(false);
    } catch (err: any) {
      console.error("💥 Error checking access:", err);
      // If check fails, allow user to proceed to purchase page
      setCheckingAccess(false);
    }
  };

  // Check access when component mounts
  useEffect(() => {
    console.log("👤 User from useAuth:", user);

    const initializePage = async () => {
      if (user) {
        await checkUserAccess();
      } else {
        console.log("❌ No user available, skipping checkUserAccess");
        setCheckingAccess(false);
      }
    };

    initializePage();
  }, [user]);

  const handlePurchase = async () => {
    if (!user || !product) return;

    setLoading(true);
    setError("");

    try {
      const checkoutData = {
        priceId: product.stripePriceId,
        customerEmail: user.email || "",
        customerName: `${user.given_name || ""} ${
          user.family_name || ""
        }`.trim(),
        successUrl: `${window.location.origin}/back-rent-reporting?purchased=true`,
        cancelUrl: `${window.location.origin}/back-rent-reporting/purchase`,
        metadata: {
          userId: user.sub,
          productId: "prod_TGyn4MgtPcaDTr",
        },
      };
      const token = await getAuthToken();
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
      console.log({ response, result });
      if (result.success) {
        window.location.href = result.url;
      } else {
        setError(result.error || "Failed to create checkout session");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    const from = location.state?.from?.pathname || "/dashboard";
    navigate(from);
  };

  // Show loading spinner while checking access
  if (checkingAccess) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">
            Checking access...
          </p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            Product Not Found
          </h1>
          <Button onClick={handleBack}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <button
              onClick={handleBack}
              className="flex items-center text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </button>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              {product.name}
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              {product.description}
            </p>
          </div>

          <Card title="Product Details">
            <div className="space-y-6">
              <div className="text-center">
                {product.originalPrice ? (
                  <div className="mb-2">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-2xl line-through text-slate-400 dark:text-slate-500">
                        ${product.originalPrice}
                      </span>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                        {Math.round(
                          ((product.originalPrice - product.price) /
                            product.originalPrice) *
                            100
                        )}
                        % OFF
                      </span>
                    </div>
                    <div className="text-4xl font-bold text-primary-600 dark:text-primary-400 mt-1">
                      ${product.price}
                    </div>
                  </div>
                ) : (
                  <div className="text-4xl font-bold text-primary-600 dark:text-primary-400 mb-2">
                    ${product.price}
                  </div>
                )}
                <div className="text-slate-600 dark:text-slate-400">
                  One-time payment
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">What's included:</h3>
                <ul className="space-y-2">
                  {product.features.map((feature, index) => (
                    <li key={index} className="flex items-center">
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
                    {product.originalPrice ? (
                      <span className="flex items-center gap-2">
                        Purchase for ${product.price}
                        {product.originalPrice && (
                          <span className="text-xs line-through opacity-70">
                            ${product.originalPrice}
                          </span>
                        )}
                      </span>
                    ) : (
                      <>Purchase for ${product.price}</>
                    )}
                  </>
                )}
              </Button>
            </div>
          </Card>

          <div className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
            <p>Secure payment powered by Stripe</p>
            <p>You'll be redirected to complete your purchase</p>
          </div>
        </div>
      </div>
    </div>
  );
}
