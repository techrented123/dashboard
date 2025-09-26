import { updateUserAttributes } from "aws-amplify/auth";

/**
 * Updates the user's plan name in Cognito user attributes
 * @param planName - The name of the plan (e.g., "Bronze", "Silver", "Gold")
 * @returns Promise with success/error result
 */
export async function updateUserPlanInCognito(planName: string) {
  try {
    await updateUserAttributes({
      userAttributes: {
        "custom:plan_name": planName,
      },
    });

    console.log(`Successfully updated plan to ${planName} in Cognito`);
    return {
      success: true,
      message: `Plan updated to ${planName}`,
    };
  } catch (error: any) {
    console.error("Failed to update plan in Cognito:", error);
    return {
      success: false,
      error: error.message || "Failed to update plan",
    };
  }
}

/**
 * Maps Stripe price ID to plan name
 * @param priceId - Stripe price ID
 * @returns Plan name or null if not found
 */
export function getPlanNameFromPriceId(priceId: string): string | null {
  const planMapping: Record<string, string> = {
    [import.meta.env.VITE_STRIPE_BRONZE_PRICE_ID ||
    "price_1R2echIaKHhzCYTqiJsQkTHM"]: "Bronze",
    [import.meta.env.VITE_STRIPE_SILVER_PRICE_ID || "plan_S3f5PwOKHCWk5G"]:
      "Silver",
    [import.meta.env.VITE_STRIPE_GOLD_PRICE_ID || "plan_S3h1gHoLzS1QFt"]:
      "Gold",
  };

  return planMapping[priceId] || null;
}

/**
 * Updates user plan in Cognito based on Stripe price ID
 * @param priceId - Stripe price ID
 * @returns Promise with success/error result
 */
export async function updateUserPlanFromPriceId(priceId: string) {
  const planName = getPlanNameFromPriceId(priceId);

  if (!planName) {
    console.warn(`Unknown price ID: ${priceId}`);
    return {
      success: false,
      error: `Unknown plan for price ID: ${priceId}`,
    };
  }

  return await updateUserPlanInCognito(planName);
}

