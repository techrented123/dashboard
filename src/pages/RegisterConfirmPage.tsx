import { useState } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import {
  confirmSignUpUser,
  resendConfirmationCode,
  signInUser,
  updateStripeCustomerId,
  submitMfaCode,
} from "../lib/auth";
import { useEffect } from "react";
import { updateUserPlanFromPriceId } from "../lib/plan-update";
import logo from "../assets/logo.png";
import { deleteTrackingSession, getSessionId } from "@/lib/user-tracking";

export default function RegisterConfirmPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [confirmationCode, setConfirmationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [autoSigningIn, setAutoSigningIn] = useState(false);
  const [showMFA, setShowMFA] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaLoading, setMfaLoading] = useState(false);
  const [storedUserData, setStoredUserData] = useState<any>(null);

  const username = location.state?.username;
  const message = location.state?.message;
  const sessionId = searchParams.get("session_id");

  // Function to retrieve Stripe session data from checkout session
  const getStripeSessionData = async (sessionId: string) => {
    try {
      const response = await fetch(
        `https://zwigvjvyub.execute-api.us-west-2.amazonaws.com/prod/stripe-webhook?session_id=${sessionId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to retrieve checkout session");
      }

      const sessionData = await response.json();
      return sessionData;
    } catch (error) {
      console.error("Error retrieving Stripe session data:", error);
      return null;
    }
  };

  // Auto sign-in after successful Stripe payment
  useEffect(() => {
    const autoSignIn = async () => {
      if (sessionId) {
        // User completed Stripe checkout successfully
        // Now we need to sign them in automatically
        setAutoSigningIn(true);

        try {
          const storedData = localStorage.getItem("registrationUserData");
          if (!storedData) {
            throw new Error("Registration data not found");
          }

          const userData = JSON.parse(storedData);
          setStoredUserData(userData);

          // Sign in the user
          const signInResult = await signInUser(
            userData.username,
            userData.password
          );

          if (signInResult.kind === "DONE") {
            // Update user plan in Cognito based on Stripe session
            try {
              const sessionData = await getStripeSessionData(sessionId!);
              if (sessionData?.price_id) {
                const planUpdateResult = await updateUserPlanFromPriceId(
                  sessionData.price_id
                );
                if (planUpdateResult.success) {
                  console.log(
                    "Plan updated successfully in Cognito:",
                    planUpdateResult.message
                  );
                } else {
                  console.warn(
                    "Failed to update plan in Cognito:",
                    planUpdateResult.error
                  );
                }
              }
            } catch (error) {
              console.error("Error updating plan in Cognito:", error);
            }

            // Clear stored data and redirect to dashboard
            localStorage.removeItem("registrationUserData");

            // Delete tracking session (non-blocking)
            try {
              const trackingId =
                getSessionId() || localStorage.getItem("userTrackingSessionId");
              if (trackingId) {
                await deleteTrackingSession(trackingId);
                sessionStorage.removeItem("userTrackingSessionId");
                localStorage.removeItem("userTrackingSessionId");
              }
            } catch (e) {
              console.warn("Failed to delete tracking session (non-fatal):", e);
            }

            navigate("/dashboard");
          } else if (signInResult.kind === "MFA") {
            // Handle MFA case
            setShowMFA(true);
            //setMfaChannel(signInResult.channel); // Default to email, adjust based on your setup
          } else {
            throw new Error(signInResult.message || "Auto sign-in failed");
          }
        } catch (error) {
          console.error("Auto sign-in failed:", error);
          // Fallback: redirect to login with success message
          localStorage.removeItem("registrationUserData");
          navigate("/login", {
            state: {
              message:
                "Registration successful! Please sign in to access your dashboard.",
            },
          });
        } finally {
          setAutoSigningIn(false);
        }
      }
    };

    autoSignIn();
  }, [sessionId, navigate]);

  const handleMFASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMfaLoading(true);
    setError("");

    const result = await submitMfaCode(mfaCode);

    if (result.kind === "DONE") {
      // Update user plan in Cognito based on Stripe session
      try {
        const sessionData = await getStripeSessionData(sessionId!);
        if (sessionData?.price_id) {
          const planUpdateResult = await updateUserPlanFromPriceId(
            sessionData.price_id
          );
          if (planUpdateResult.success) {
            console.log(
              "Plan updated successfully in Cognito:",
              planUpdateResult.message
            );
          } else {
            console.warn(
              "Failed to update plan in Cognito:",
              planUpdateResult.error
            );
          }
        }
      } catch (error) {
        console.error("Error updating plan in Cognito:", error);
      }

      // Clear stored data and redirect to dashboard
      localStorage.removeItem("registrationUserData");
      navigate("/dashboard");
    } else {
      const errorMessage =
        result.kind === "ERROR" ? result.message : "MFA verification failed";
      const formattedError =
        errorMessage.charAt(0).toUpperCase() + errorMessage.slice(1);
      setError(formattedError);
    }

    setMfaLoading(false);
  };

  // If coming from Stripe checkout success
  if (sessionId && !username) {
    // Show MFA form if required during auto sign-in
    if (showMFA) {
      return (
        <main className="min-h-screen grid place-items-center p-4 bg-gradient-to-b from-white to-primary-50 dark:from-slate-900 dark:to-slate-800">
          <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-soft p-6 border dark:border-slate-700">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎉</span>
              </div>
              <h1 className="text-xl font-semibold text-primary-800 dark:text-primary-300 mb-2">
                Almost There!
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Please verify your email to access your dashboard
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl">
                <p className="text-sm text-red-700 dark:text-red-400">
                  {error}
                </p>
              </div>
            )}

            <form onSubmit={handleMFASubmit} className="space-y-4">
              <div>
                <label className="text-sm block mb-1 dark:text-slate-300">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  className="w-full rounded-xl border dark:border-slate-600 px-3 py-2 outline-none focus:ring-2 focus:ring-secondary-300 transition-all bg-white dark:bg-slate-700 dark:text-white"
                  placeholder="Enter 6-digit code"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={mfaLoading}
                className="w-full bg-secondary text-white rounded-xl py-3 font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {mfaLoading ? "Verifying..." : "Verify & Access Dashboard"}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button
                onClick={() => resendConfirmationCode(storedUserData?.username)}
                className="text-sm text-secondary hover:underline"
              >
                Resend verification code
              </button>
            </div>
          </div>
        </main>
      );
    }

    if (autoSigningIn) {
      return (
        <main className="min-h-screen grid place-items-center p-4 bg-gradient-to-b from-white to-primary-50 dark:from-slate-900 dark:to-slate-800">
          <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-soft p-6 border dark:border-slate-700">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-secondary mx-auto mb-4"></div>
              <h1 className="text-xl font-semibold text-primary-800 dark:text-primary-300 mb-2">
                Setting up your account...
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Please wait while we sign you in automatically
              </p>
            </div>
          </div>
        </main>
      );
    }

    return (
      <main className="min-h-screen grid place-items-center p-4 bg-gradient-to-b from-white to-primary-50 dark:from-slate-900 dark:to-slate-800">
        <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-soft p-6 border dark:border-slate-700">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🎉</span>
            </div>
            <h1 className="text-2xl font-semibold text-primary-800 dark:text-primary-300 mb-2">
              Welcome to Rented123!
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Your subscription is active and your 2-month free trial has
              started!
            </p>
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-secondary mx-auto mb-4"></div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Redirecting to your dashboard...
            </p>
          </div>
        </div>
      </main>
    );
  }

  // If coming from Stripe checkout success but need fallback
  if (sessionId && !username) {
    return (
      <main className="min-h-screen grid place-items-center p-4 bg-gradient-to-b from-white to-primary-50 dark:from-slate-900 dark:to-slate-800">
        <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-soft p-6 border dark:border-slate-700">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🎉</span>
            </div>
            <h1 className="text-2xl font-semibold text-primary-800 dark:text-primary-300 mb-2">
              Welcome to Rented123!
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Your subscription is active and your 2-month free trial has
              started!
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              Please sign in to access your dashboard.
            </p>
            <button
              onClick={() => navigate("/login")}
              className="w-full bg-secondary text-white rounded-xl py-3 font-medium hover:opacity-90 transition-opacity"
            >
              Sign In to Your Dashboard
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!username) {
    navigate("/register");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // First, confirm the user's sign-up code
    const confirmResult = await confirmSignUpUser(username, confirmationCode);

    if (confirmResult.success) {
      setSuccess("Email verified successfully! Signing you in...");

      // --- NEW: Sign-in logic starts here ---
      try {
        // 1. Retrieve the temporarily stored user credentials
        const storedData = localStorage.getItem("registrationUserData");
        if (!storedData) {
          throw new Error("Session data not found for auto sign-in.");
        }
        const userData = JSON.parse(storedData);

        // 2. Attempt to sign the user in
        const signInResult = await signInUser(
          userData.username,
          userData.password
        );

        if (signInResult.kind === "DONE") {
          console.log("success sign in ", signInResult);

          // Update user attribute with Stripe customer ID if sessionId exists
          if (sessionId) {
            try {
              const sessionData = await getStripeSessionData(sessionId!);
              const stripeCustomerId = sessionData?.customer_id;
              if (stripeCustomerId) {
                const updateResult = await updateStripeCustomerId(
                  stripeCustomerId
                );
                if (updateResult.success) {
                  console.log(
                    "Stripe customer ID updated successfully:",
                    stripeCustomerId
                  );
                  try {
                    const trackingId =
                      getSessionId() ||
                      localStorage.getItem("userTrackingSessionId");
                    if (trackingId) {
                      console.log(
                        "[Confirm] About to delete tracking:",
                        trackingId
                      );

                      const result = await deleteTrackingSession(trackingId);
                      console.log("[Confirm] Delete result:", result);
                      sessionStorage.removeItem("userTrackingSessionId");
                      localStorage.removeItem("userTrackingSessionId");
                    }
                  } catch (e) {
                    console.warn(
                      "Failed to delete tracking session (non-fatal):",
                      e
                    );
                  }
                } else {
                  console.error(
                    "Failed to update Stripe customer ID:",
                    updateResult.message
                  );
                }
              }
            } catch (error) {
              console.error("Error updating Stripe customer ID:", error);
            }
          }

          // If sign-in is successful, clear the stored data and go to the dashboard
          localStorage.removeItem("registrationUserData");
          navigate("/dashboard");
          return; // Important: exit the function here
        } else {
          // If sign-in fails for some reason (e.g., MFA required, though you're ignoring it)
          throw new Error(
            signInResult.message || "Sign-in failed. Please log in manually."
          );
        }
      } catch (signInError) {
        console.error("Auto sign-in after confirmation failed:", signInError);
        // If auto sign-in fails, the user is still confirmed.
        // Send them to the login page with a helpful message.
        localStorage.removeItem("registrationUserData"); // Clean up anyway
        navigate("/login", {
          state: {
            message: "Your account is confirmed! Please sign in to continue.",
          },
        });
      }
      // --- End of new sign-in logic ---
    } else {
      // This is the original logic for a failed confirmation
      const formattedError =
        confirmResult.message.charAt(0).toUpperCase() +
        confirmResult.message.slice(1);
      setError(formattedError);
      setLoading(false); // Stop loading only on confirmation failure
    }
  };

  const handleResendCode = async () => {
    const result = await resendConfirmationCode(username);
    if (result.success) {
      setError("");
    } else {
      // Capitalize first letter and format Cognito error messages
      const formattedError =
        result.message.charAt(0).toUpperCase() + result.message.slice(1);
      setError(formattedError);
    }
  };

  return (
    <main className="min-h-screen grid place-items-center p-4 bg-gradient-to-b from-white to-primary-50 dark:from-slate-900 dark:to-slate-800">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-soft p-6 border dark:border-slate-700">
        <div className="text-center mb-6">
          <img src={logo} alt="Rented123 Logo" className="h-20 mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-primary-800 dark:text-primary-300 mb-2">
            Verify Your Email
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {message || `We've sent a verification code to your email address`}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl">
            <p className="text-sm text-green-700 dark:text-green-400">
              {success}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm block mb-1 dark:text-slate-300">
              Verification Code
            </label>
            <input
              type="text"
              value={confirmationCode}
              onChange={(e) => setConfirmationCode(e.target.value)}
              className="w-full rounded-xl border dark:border-slate-600 px-3 py-2 outline-none focus:ring-2 focus:ring-secondary-300 transition-all bg-white dark:bg-slate-700 dark:text-white"
              placeholder="Enter 6-digit code"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-secondary text-white rounded-xl py-3 font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Verify Email"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={handleResendCode}
            className="text-sm text-secondary hover:underline"
          >
            Resend verification code
          </button>
        </div>

        {!success && (
          <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl">
            <p className="text-xs text-blue-700 dark:text-blue-400 text-center">
              After verification, you'll be able to sign in and complete your
              subscription setup.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
