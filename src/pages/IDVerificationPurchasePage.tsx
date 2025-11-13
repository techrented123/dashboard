import { useState } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import Card from "../components/Card";
import { Button } from "../components/ui/button";
import { ArrowLeft, CreditCard, CheckCircle2 } from "lucide-react";
import { createIdVerificationCheckoutSession } from "../lib/stripe";

export default function IDVerificationPurchasePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Anonymous purchase: no user data or auth required

  // Resolve return path
  const from = searchParams.get("from") || "/register/billing";

  // No effect: we do not attempt to read auth/session here 

  const handleBack = () => {
    navigate("/register/id-verification");
  };

  const handlePurchase = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await createIdVerificationCheckoutSession(from);
      if (!result.success) {
        throw new Error(result.error || "Failed to create checkout session");
      }
      window.location.href = result.url;
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <button
              onClick={handleBack}
              className="flex items-center text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </button>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              ID Verification
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Verify your identity to unlock Silver and Gold membership plans.
            </p>
          </div>

          <Card title="Product Details" className="max-w-md mx-auto">
            <div className="space-y-8">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary-600 dark:text-primary-400 mb-2">
                  {/* Price is illustrative; Stripe price controls the charge */}
                  $4.99
                </div>
                <div className="text-slate-600 dark:text-slate-400">
                  One-time verification
                </div>
              </div>

              <ul className="space-y-2">
                {[
                  "One-time identity verification",
                  "Required for Silver and Gold",
                  "Fast verification turnaround",
                ].map((f) => (
                  <li key={f} className="flex items-center">
                    <CheckCircle2 className="text-green-500 mr-2 w-5 h-5" />
                    {f}
                  </li>
                ))}
              </ul>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-red-700 dark:text-red-400">
                  {error}
                </div>
              )}

              <Button
                onClick={handlePurchase}
                disabled={loading}
                className="w-full text-white bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                {loading ? (
                  <>Processing...</>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Purchase ID Verification
                  </>
                )}
              </Button>

              <div className="text-center text-sm text-slate-500 dark:text-slate-400">
                Secure payment powered by Stripe
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
