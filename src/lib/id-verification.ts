export interface IdVerificationData {
  status: "found" | "not_found" | "error" | "pending";
  reportUrl?: string;
  lastChecked?: string;
  message?: string;
}

/**
 * Checks ID verification report in S3 via Lambda API
 * Calls the actual Lambda function deployed on API Gateway
 */
export async function checkIdVerification(
  email: string
): Promise<IdVerificationData> {
  try {
    console.log("Checking ID verification for email:", email);

    const apiUrl = "https://bvdb6oi69c.execute-api.us-west-2.amazonaws.com";
    const response = await fetch(
      `${apiUrl}?email=${encodeURIComponent(email)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    console.log("ID verification API response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ID verification API error:", errorText);

      if (response.status === 404) {
        return {
          status: "not_found",
          lastChecked: new Date().toISOString(),
          message:
            "ID verification report not found. Please complete ID verification first.",
        };
      }

      return {
        status: "error",
        lastChecked: new Date().toISOString(),
        message: "Error checking ID verification. Please try again.",
      };
    }

    const data = await response.json();
    console.log("ID verification API response data:", data);

    return {
      status: data.status,
      reportUrl: data.reportUrl,
      lastChecked: data.lastChecked || new Date().toISOString(),
      message: data.message,
    };
  } catch (error) {
    console.error("Error checking ID verification:", error);
    return {
      status: "error",
      lastChecked: new Date().toISOString(),
      message: "Error checking ID verification. Please try again.",
    };
  }
}
