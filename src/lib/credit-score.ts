import { fetchAuthSession } from "aws-amplify/auth";

export interface CreditScoreData {
  score: number;
  min: number;
  max: number;
  lastUpdated: string;
  bureau: string;
  status: "active" | "pending" | "error" | "no_score";
}

/**
 * Fetches credit score data from the API
 */
export async function fetchCreditScore(): Promise<CreditScoreData> {
  try {
    const session = await fetchAuthSession();
    const token = session.tokens?.idToken?.toString();

    if (!token) {
      throw new Error("User not authenticated");
    }

    const response = await fetch(
      "https://48rw3vtf38.execute-api.us-west-2.amazonaws.com",
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      // Check if it's a 404 (no credit score found) vs other errors
      if (response.status === 404) {
        return {
          score: 0,
          min: 300,
          max: 850,
          lastUpdated: new Date().toISOString(),
          bureau: "N/A",
          status: "no_score",
        };
      }
      throw new Error(`Failed to fetch credit score: ${response.status}`);
    }

    const data = await response.json();

    // Check if the response indicates no credit score available
    if (!data.score && !data.creditScore && data.status === "no_score") {
      return {
        score: 0,
        min: 300,
        max: 850,
        lastUpdated: new Date().toISOString(),
        bureau: "N/A",
        status: "no_score",
      };
    }

    // Ensure the response has the expected structure
    return {
      score: data.score || data.creditScore || 0,
      min: data.min || 300,
      max: data.max || 850,
      lastUpdated:
        data.lastUpdated || data.updatedAt || new Date().toISOString(),
      bureau: data.bureau || data.creditBureau || "Equifax",
      status: data.status || "active",
    };
  } catch (error) {
    console.error("Error fetching credit score:", error);
    throw error;
  }
}
