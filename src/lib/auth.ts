// auth.ts
// -----------------------------------------------------------
// Amplify-only auth (no manual SRP). Handles:
// - Sign up / confirm / resend
// - Sign in -> detect next step (DONE, SMS/Email OTP, NEW_PASSWORD_REQUIRED)
// - Confirm sign in (MFA/OTP)
// - Password reset (forgot/confirm)
// - Sign out
// - Current user / isAuthenticated
// - Optional in-app email verification (one-time attribute verification)
// -----------------------------------------------------------

import { Amplify } from "aws-amplify";
import {
  signIn,
  confirmSignIn,
  signUp,
  confirmSignUp,
  resendSignUpCode,
  signOut,
  getCurrentUser,
  fetchAuthSession,
  fetchUserAttributes,
  resetPassword,
  confirmResetPassword,
  updateUserAttributes,
  type SignInOutput,
} from "aws-amplify/auth";
// Add these functions to your existing auth.js file

import {
  CognitoIdentityProviderClient,
  GetUserAttributeVerificationCodeCommand,
  VerifyUserAttributeCommand,
} from "@aws-sdk/client-cognito-identity-provider";

// ---------- Amplify config ----------
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: "us-west-2_Jxmxbh6H5",
      userPoolClientId: "27re41h9g6r2phbstnpsodt5gm",
      // Adjust login aliases to match your pool
      loginWith: {
        email: true,
        username: true,
        phone: false,
      },
      // This controls sign-up verification from the client SDK perspective;
      // your console settings (Cognito-assisted vs don't send) still apply.
      signUpVerificationMethod: "code",
    },
  },
});

// ---------- Types ----------
export interface User {
  email: string;
  sub: string;
  name?: string;
  attributes?: Record<string, string>;
}

export interface SignUpData {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  middleName: string;
  phoneNumber: string;
  address: string;
  birthdate: string; // YYYY-MM-DD
  monthlyRent: string;
  ownership: string;
  leaseAgreementUrl?: string;
}

export type SignInStep =
  | { kind: "DONE" }
  | { kind: "MFA"; channel: "SMS" | "EMAIL" }
  | { kind: "NEW_PASSWORD_REQUIRED" }
  | { kind: "ERROR"; message: string };

// ---------- Helpers ----------
function mapNextStep(out: SignInOutput): SignInStep {
  const step = out.nextStep.signInStep;

  if (step === "DONE") return { kind: "DONE" };
  if (step === "CONFIRM_SIGN_IN_WITH_SMS_CODE")
    return { kind: "MFA", channel: "SMS" };
  if (step === "CONFIRM_SIGN_IN_WITH_EMAIL_CODE")
    return { kind: "MFA", channel: "EMAIL" };
  if (step === "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED")
    return { kind: "NEW_PASSWORD_REQUIRED" };

  return { kind: "ERROR", message: `Unhandled sign-in step: ${step}` };
}

// ---------- Sign up ----------

// --- call this Lambda as your Pre Sign-up trigger ---
/*
export const handler = async (event) => {
  event.response.autoConfirmUser = true;
  event.response.autoVerifyEmail = true;   // <- important
  // event.response.autoVerifyPhone = true; // if you ever need it
  return event;
};
*/

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Signs up a new user with Cognito, including all required attributes.
 */

export async function signUpUser(data: SignUpData) {
  try {
    await signUp({
      username: data.username,
      password: data.password,
      options: {
        userAttributes: {
          email: data.email,
          given_name: data.firstName,
          family_name: data.lastName,
          middle_name: data.middleName,
          phone_number: data.phoneNumber,
          address: data.address,
          birthdate: data.birthdate,
          preferred_username: data.username,
          "custom:MonthlyRent": data.monthlyRent,
          "custom:ownership-title": data.ownership,
          "custom:lease-agreement-url": data.leaseAgreementUrl ?? "",
        },
      },
    });
    return { success: true, message: "Registration successful!" };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message ?? "Registration failed. Please try again.",
    };
  }
}

/** A) Safer sign-in: succeeds when signed in even if token lags; small retries included */
export async function signInUser(username: string, password: string) {
  const MAX_RETRIES = 3;
  console.log("Attempting to sign in user:", username);
  const RETRY_DELAY = 1000; // 1 second

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await signIn({ username, password });
      if (result.isSignedIn) {
        return { kind: "DONE" }; // Success!
      }

      // Handle MFA case
      if (
        result.nextStep?.signInStep ===
          "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED" ||
        result.nextStep?.signInStep === "CONFIRM_SIGN_IN_WITH_SMS_CODE" ||
        result.nextStep?.signInStep === "CONFIRM_SIGN_IN_WITH_TOTP_CODE"
      ) {
        return {
          kind: "MFA",
          channel: result.nextStep.signInStep.includes("SMS") ? "SMS" : "EMAIL",
        };
      }

      // If sign-in is not complete for other reasons, fail gracefully.
      return {
        kind: "ERROR",
        message: `Sign-in requires next step: ${result.nextStep.signInStep}`,
      };
    } catch (error: any) {
      // Check if the error is the specific "User is not confirmed" error from the race condition.
      if (error.name === "UserNotConfirmedException" && attempt < MAX_RETRIES) {
        console.warn(
          `Attempt ${attempt}: User not confirmed yet due to replication delay. Retrying in ${RETRY_DELAY}ms...`
        );
        await delay(RETRY_DELAY); // Wait before the next attempt
      } else {
        // For any other error, or on the last retry attempt, fail immediately.
        console.error(`Sign-in error (attempt ${attempt}):`, error);
        return { kind: "ERROR", message: error.message };
      }
    }
  }
  // This is only reached if all retries fail with UserNotConfirmedException
  return {
    kind: "ERROR",
    message:
      "Account created, but could not be confirmed in time. Please try logging in manually.",
  };
}

/* export async function signInUser(username: string, password: string) {
  try {
    const res = await signIn({ username, password });

    if (!res.isSignedIn) {
      const step = res.nextStep?.signInStep ?? "UNKNOWN";
      return { success: false, message: `Sign-in requires next step: ${step}`, token: null };
    }

    // Try to fetch tokens up to 3 times (hydration lag)
    const sleeps = [150, 300, 600];
    for (let i = 0; i < sleeps.length; i++) {
      const session = await fetchAuthSession({ forceRefresh: i > 0 });
      const token = session.tokens?.idToken?.toString() ?? null;
      if (token) return { success: true, token };
      await new Promise(r => setTimeout(r, sleeps[i]));
    }

    // Still no token, but user is signed in; allow caller to retry later.
    return { success: true, token: null };
  } catch (error: any) {
    return { success: false, message: error?.message ?? "Sign-in failed", token: null };
  }
}
 */

export async function confirmSignUpUser(username: string, code: string) {
  try {
    await confirmSignUp({ username, confirmationCode: code });
    return {
      success: true,
      message: "Email verified successfully! You can now sign in.",
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message ?? "Verification failed. Please try again.",
    };
  }
}

export async function resendConfirmationCode(username: string) {
  try {
    await resendSignUpCode({ username });
    return {
      success: true,
      message: "Verification code sent! Please check your email.",
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message ?? "Failed to resend code. Please try again.",
    };
  }
}

// ---------- Sign in (SRP handled by Amplify) ----------
/* export async function signInUser(username, password) {
  try {
    const result = await signIn({ username, password });
    console.log('Sign in result:', result);
    if (result.isSignedIn) {
      console.log('User is signed in, checking session...');
      // Wait a moment for the session to be available
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Try to get the session to verify it's working
      const session = await fetchAuthSession();
      console.log('Session after sign in:', session);
      
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      console.log({session,token})

      return { success: true, token: token }; // Return the token on success
    }
    return { success: false, message: `Sign-in requires next step: ${result.nextStep.signInStep}` };
  } catch (error) {
    console.error('Sign in error details:', error);
    return { success: false, message: error.message };
  }
}

 */

// ---------- Confirm OTP/MFA ----------
export async function submitMfaCode(code: string): Promise<SignInStep> {
  try {
    const result = await confirmSignIn({ challengeResponse: code });
    return mapNextStep(result);
  } catch (err: any) {
    return {
      kind: "ERROR",
      message: err?.message ?? "MFA confirmation failed.",
    };
  }
}

// ---------- Password reset ----------
export async function startPasswordReset(username: string) {
  try {
    await resetPassword({ username }); // sends code via your recovery channel
    return {
      success: true,
      message: "Reset code sent. Check your email or SMS.",
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message ?? "Could not start password reset.",
    };
  }
}

export async function confirmPasswordReset(
  username: string,
  confirmationCode: string,
  newPassword: string
) {
  try {
    await confirmResetPassword({ username, confirmationCode, newPassword });
    return { success: true, message: "Password updated. You can now sign in." };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message ?? "Password reset failed.",
    };
  }
}

// Define a consistent return type for auth operations
type AuthResult = {
  success: boolean;
  message?: string;
};

/**
 * Initiates the password reset process by sending a code to the user's email.
 * @param {string} username - The user's email address.
 * @returns {Promise<AuthResult>}
 */
export async function forgotPassword(username: string): Promise<AuthResult> {
  try {
    const output = await resetPassword({ username });
    console.log(
      "Password reset code sent to:",
      output.nextStep.codeDeliveryDetails.destination
    );
    return { success: true };
  } catch (error: any) {
    console.error("Error sending password reset code:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Confirms the password reset using the code and sets the new password.
 * @param {string} username - The user's email address.
 * @param {string} confirmationCode - The 6-digit code from the email.
 * @param {string} newPassword - The user's new desired password.
 * @returns {Promise<AuthResult>}
 */
export async function confirmNewPassword(
  username: string,
  confirmationCode: string,
  newPassword: string
): Promise<AuthResult> {
  try {
    await confirmResetPassword({ username, confirmationCode, newPassword });
    return {
      success: true,
      message: "Password has been reset successfully. You can now log in.",
    };
  } catch (error: any) {
    console.error("Error confirming new password:", error);
    return { success: false, message: error.message };
  }
}

// ---------- Change email (will set email_verified=false) ----------
export async function changeEmail(newEmail: string) {
  try {
    await updateUserAttributes({ userAttributes: { email: newEmail } });
    // Depending on pool settings, Cognito may or may not auto-send a verification code.
    return {
      success: true,
      message: "Email updated. Please verify your new address.",
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message ?? "Could not update email.",
    };
  }
}

export async function updateStripeCustomerId(stripeCustomerId: string) {
  try {
    await updateUserAttributes({
      userAttributes: {
        "custom:stripe_customer_id_2": stripeCustomerId,
      },
    });
    return {
      success: true,
      message: "Stripe customer ID updated successfully",
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message ?? "Could not update Stripe customer ID.",
    };
  }
}

// ---------- Optional in-app one-time email verification ----------
const cip = new CognitoIdentityProviderClient({ region: "us-west-2" });

export async function sendEmailVerifyCode() {
  const session = await fetchAuthSession();
  const accessToken = session.tokens?.accessToken?.toString();
  if (!accessToken) throw new Error("Not authenticated");

  await cip.send(
    new GetUserAttributeVerificationCodeCommand({
      AccessToken: accessToken,
      AttributeName: "email",
    })
  );
}

export async function verifyEmailWithCode(code: string) {
  const session = await fetchAuthSession();
  const accessToken = session.tokens?.accessToken?.toString();
  if (!accessToken) throw new Error("Not authenticated");

  await cip.send(
    new VerifyUserAttributeCommand({
      AccessToken: accessToken,
      AttributeName: "email",
      Code: code,
    })
  );
  return { success: true, message: "Email verified." };
}

// ---------- Current user / attributes ----------
export async function getAmplifyCurrentUser(): Promise<User | null> {
  try {
    const u = await getCurrentUser();
    const attrs = await fetchUserAttributes().catch(
      () => ({} as Record<string, string>)
    );
    return {
      email: attrs.email ?? u.signInDetails?.loginId ?? "",
      sub: attrs.sub ?? u.userId,
      name: attrs.name ?? u.signInDetails?.loginId ?? "",
      attributes: attrs as Record<string, string>,
    };
  } catch {
    return null;
  }
}

// ---------- Is authenticated ----------
export async function isAuthenticated(): Promise<boolean> {
  try {
    const session = await fetchAuthSession();
    return Boolean(session.tokens?.accessToken);
  } catch {
    return false;
  }
}

// ---------- Sign out ----------
export async function signOutUser(): Promise<void> {
  try {
    await signOut();
  } catch (err) {
    console.error("Sign out error:", err);
  }
}
