import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Edit3, CreditCard, Loader2 } from "lucide-react";
import {
  signUp,
  fetchAuthSession,
  signIn,
  updateUserAttributes,
} from "aws-amplify/auth";
import { getPresignedUrl } from "../lib/documents";
import logo from "../assets/logo.png";

// --- PLACEHOLDER DEPENDENCIES (for a complete file) ---

// Placeholder for your Plan types and data
const PLANS = [
  {
    id: "gold",
    name: "Gold",
    price: "29.99",
    stripeId: import.meta.env.VITE_STRIPE_GOLD_PRICE_ID,
  },
  {
    id: "silver",
    name: "Silver",
    price: "9.99",
    stripeId: import.meta.env.VITE_STRIPE_SILVER_PRICE_ID,
  },
  {
    id: "bronze",
    name: "Bronze",
    price: "4.99",
    stripeId: import.meta.env.VITE_STRIPE_BRONZE_PRICE_ID,
  },
];
const getPlanFromUrl = () => PLANS[0]; // Default to first plan

// Placeholder for your UI components
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
    className={`p-4 border-2 rounded-xl cursor-pointer ${
      selected ? "border-secondary" : "border-slate-300"
    }`}
  >
    <h3 className="font-bold">{plan.name}</h3>
    <p>${plan.price}/month</p>
  </div>
);

// --- COGNITO UPDATE HELPER FUNCTION ---
async function updateCognitoLeaseUrl(leaseKey: string) {
  try {
    console.log("Updating Cognito with lease agreement URL:", leaseKey);

    await updateUserAttributes({
      userAttributes: {
        "custom:lease-agreement-url": leaseKey,
      },
    });

    console.log("Successfully updated Cognito with lease agreement URL");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to update Cognito with lease URL:", error);
    return { success: false, error: error.message };
  }
}

// --- LEASE UPLOAD HELPER FUNCTION ---
async function uploadLeaseAgreement(userInfo: any) {
  if (!userInfo.leaseAgreement) {
    console.log("No lease agreement to upload");
    return { success: true, docId: null, key: null };
  }

  try {
    console.log("Uploading lease agreement...");
    console.log("File details:", {
      name: userInfo.leaseAgreement.name,
      type: userInfo.leaseAgreement.type,
      size: userInfo.leaseAgreement.size,
    });

    // Ensure filename is not empty and has proper extension
    let filename = userInfo.leaseAgreement.name;
    if (!filename || filename.trim() === "") {
      // Generate a fallback filename with proper extension
      const fileExtension =
        userInfo.leaseAgreement.type === "application/pdf" ? ".pdf" : ".pdf";
      filename = `lease-agreement-${Date.now()}${fileExtension}`;
    }

    // Ensure filename has proper extension
    if (!filename.includes(".")) {
      const fileExtension =
        userInfo.leaseAgreement.type === "application/pdf" ? ".pdf" : ".pdf";
      filename = `${filename}${fileExtension}`;
    }

    console.log("Final filename:", filename);

    // Validate that filename is not empty before proceeding
    if (!filename || filename.trim() === "") {
      throw new Error("Filename is required but was empty");
    }

    // Get presigned URL for upload
    const presignedData = await getPresignedUrl({
      filename: filename,
      mime: userInfo.leaseAgreement.type || "application/pdf",
      selectValue: "tenants-lease-agreements",
      source: "Lease Agreement", // Pass the correct source name
      firstName: userInfo.firstName,
      lastName: userInfo.lastName,
      phone: userInfo.phoneNumber,
      email: userInfo.email,
    });

    console.log("Got presigned URL:", presignedData);

    // Upload file to S3 using presigned URL
    const uploadResponse = await fetch(presignedData.uploadUrl, {
      method: "PUT",
      body: userInfo.leaseAgreement,
      headers: {
        "Content-Type": userInfo.leaseAgreement.type || "application/pdf",
      },
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.statusText}`);
    }

    console.log("Lease agreement uploaded successfully");
    return {
      success: true,
      docId: presignedData.docId,
      key: presignedData.key,
    };
  } catch (error: any) {
    console.error("Lease upload error:", error);
    return { success: false, error: error.message };
  }
}

// --- AUTH HELPER FUNCTIONS (Corrected Versions) ---
async function signUpUser(userData: any) {
  console.log({ userData });

  try {
    const signUpResponse = await signUp({
      username: userData.username,
      password: userData.password,
      options: {
        userAttributes: {
          email: userData.email,
          given_name: userData.firstName,
          family_name: userData.lastName,
          middle_name: userData.middleName || "",
          phone_number: userData.phoneNumber || "",
          address: userData.address || "",
          birthdate: userData.birthdate || "",
          preferred_username: userData.username,
          "custom:MonthlyRent": userData.monthlyRent || "",
          "custom:ownership-title": userData.ownership || "tenant",
          "custom:address_2": userData.address2 || "",
          "custom:city": userData.city || "",
          "custom:province": userData.province || "",
          "custom:postal_code": userData.postalCode || "",
          "custom:country": userData.country || "Canada",
          "custom:lease-agreement-url": userData.leaseAgreementUrl || "",
          "custom:stripe_customer_id_2": "a",
        },
      },
    });
    // With your Pre Sign-up Lambda, a success here means the user is auto-confirmed.
    console.log("SignUp response:", signUpResponse);
    return { success: true, userSub: signUpResponse.userId };
  } catch (error: any) {
    console.error("Sign-up error:", error);
    return { success: false, message: error.message };
  }
}

// --- STRIPE HELPER FUNCTION ---

export async function createCheckoutSession(checkoutData: any) {
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

// --- MAIN COMPONENT ---

export default function RegisterBillingPage() {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState(getPlanFromUrl());
  const [showAllPlans, setShowAllPlans] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const storedData = localStorage.getItem("registrationUserData");
    if (storedData) {
      setUserInfo(JSON.parse(storedData));
    } else {
      // If there's no user info, we can't proceed. Send them back.
      navigate("/register");
    }
  }, [navigate]);

  const handlePlanSelect = (planId: string) => {
    const plan = PLANS.find((p) => p.id === planId);
    if (plan) {
      setSelectedPlan(plan);
      setShowAllPlans(false);
    }
  };

  /**
   * CORRECTED: This handler now follows the proper sign-up -> sign-in -> checkout flow.
   */
  /**
   * Handles the final registration step: creates the Cognito user, signs them in,
   * and redirects to Stripe for payment.
   */
  // In your RegisterBillingPage.jsx component

  const handleCompleteRegistration = async () => {
    if (!userInfo) {
      setError("User information is missing. Please go back.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Step 1: Sign up the user (auto-confirmed by Lambda)
      console.log("Step 1: Creating user account...");
      const signUpResult = await signUpUser(userInfo);
      if (!signUpResult.success) {
        throw new Error(
          signUpResult.message || "Could not create your account."
        );
      }
      console.log("Step 1: User account created successfully");
      console.log("UserSub from signup:", signUpResult.userSub);

      // Step 2: Sign in the user to get authentication token for lease upload
      console.log("Step 2: Signing in user for lease upload...");
      await signIn({
        username: userInfo.username,
        password: userInfo.password,
      });
      console.log("Step 2: User signed in successfully");

      // Step 3: Upload lease agreement if provided
      console.log("Step 3: Uploading lease agreement...");
      const uploadResult = await uploadLeaseAgreement(userInfo);
      if (!uploadResult.success) {
        throw new Error(
          uploadResult.error || "Could not upload lease agreement."
        );
      }
      console.log("Step 3: Lease agreement uploaded successfully");

      // Step 3.5: Update Cognito with lease agreement URL if uploaded
      if (uploadResult.key) {
        console.log("Step 3.5: Updating Cognito with lease agreement URL...");
        const cognitoUpdateResult = await updateCognitoLeaseUrl(
          uploadResult.key
        );
        if (!cognitoUpdateResult.success) {
          console.warn(
            "Failed to update Cognito with lease URL, but continuing:",
            cognitoUpdateResult.error
          );
        } else {
          console.log("Step 3.5: Cognito updated with lease agreement URL");
        }
      }

      // Step 4: Prepare checkout data (no authentication needed for registration flow)
      console.log("Step 4: Preparing checkout data...");
      const checkoutData = {
        priceId: selectedPlan.stripeId,
        customerEmail: userInfo.email,
        customerName: `${userInfo.firstName} ${userInfo.lastName}`,
        userId: signUpResult.userSub, // Use the actual userSub from Cognito for Stripe metadata
        username: userInfo.username, // Use the actual username for Cognito updates
        successUrl: `${window.location.origin}/dashboard`,
        cancelUrl: `${window.location.origin}/register/billing`,
      };

      // Step 5: Create the Stripe session (no auth token needed for registration)
      console.log("Step 5: Creating Stripe checkout session...");
      const checkoutResult = await createCheckoutSession(checkoutData);
      if (!checkoutResult.success) {
        throw new Error(
          checkoutResult.error || "Could not initiate payment session."
        );
      }
      console.log("Step 5: Checkout session created successfully");

      // Step 6: Redirect to Stripe Checkout
      // User will be signed in after successful payment via webhook
      window.location.href = checkoutResult.url;
    } catch (err: any) {
      // Any failure in the multi-step process will be caught and displayed here.
      console.error("Registration process failed:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate("/register");
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-primary-50 dark:from-slate-900 dark:to-slate-800 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Logo */}
          <div className="text-center mb-8">
            <img src={logo} alt="Rented123 Logo" className="h-16 mx-auto" />
          </div>

          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-8 mb-4">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 bg-secondary text-white rounded-full flex items-center justify-center text-sm font-medium">
                  ✓
                </div>
                <span className="text-sm text-secondary font-medium">
                  User Information
                </span>
              </div>
              <div className="w-12 h-0.5 bg-secondary"></div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 bg-secondary text-white rounded-full flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <span className="text-sm font-medium text-secondary">
                  Billing & Plan
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Plan Selection */}
            <div className="space-y-6">
              <div>
                <button
                  onClick={handleBack}
                  className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors mb-4"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to User Information
                </button>
                {showAllPlans ? (
                  <>
                    <h1 className="text-2xl font-semibold text-primary-800 dark:text-primary-300 mb-2">
                      Choose Your Plan
                    </h1>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Start with a 2-month free trial, then continue with your
                      selected plan
                    </p>
                  </>
                ) : (
                  <>
                    <h1 className="text-2xl font-semibold text-primary-800 dark:text-primary-300 mb-2">
                      Your Selected Plan
                    </h1>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Complete your registration with the {selectedPlan.name}{" "}
                      plan
                    </p>
                  </>
                )}
              </div>
              {showAllPlans ? (
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
              ) : (
                <div className="space-y-4">
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-secondary p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                          {selectedPlan.name} Plan
                        </h3>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">
                          ${selectedPlan.price}
                          <span className="text-sm font-normal text-slate-600 dark:text-slate-400">
                            /month
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowAllPlans(true)}
                        className="flex items-center gap-2 text-sm text-secondary hover:underline"
                      >
                        <Edit3 className="w-4 h-4" /> Change Plan
                      </button>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl p-3">
                      <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                        🎉 2 months free trial included!
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        You won't be charged until{" "}
                        {new Date(
                          Date.now() + 60 * 24 * 60 * 60 * 1000
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Form */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-soft p-6 border dark:border-slate-700 h-fit">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-2">
                  Complete Registration
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
                        Ready to Complete Registration
                      </h3>
                      <p className="text-sm text-blue-700 dark:text-blue-400">
                        Click below to create your account and start your
                        2-month free trial.
                      </p>
                    </div>
                    <button
                      onClick={handleCompleteRegistration}
                      disabled={loading}
                      className="w-full bg-secondary text-white rounded-xl py-3 font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Creating
                          account...
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4" /> Complete
                          Registration & Start Free Trial
                        </>
                      )}
                    </button>
                    <div className="text-center">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        🎉 No charge for 60 days • Cancel anytime • Secure
                        checkout by Stripe
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-600 dark:text-slate-400 mb-4">
                    Please complete the user information form first.
                  </p>
                  <button
                    onClick={handleBack}
                    className="bg-secondary text-white px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
                  >
                    Go to User Information
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
