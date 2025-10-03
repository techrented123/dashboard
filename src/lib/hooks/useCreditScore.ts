import { useQuery } from "@tanstack/react-query";
import { fetchCreditScore } from "../credit-score";
import type { CreditScoreData } from "../credit-score";

// Hook for fetching credit score
export const useCreditScore = () => {
  return useQuery<CreditScoreData>({
    queryKey: ["creditScore"],
    queryFn: fetchCreditScore,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: (failureCount, error) => {
      // Don't retry on auth errors or 404 (no credit score)
      if (error instanceof Error && error.message.includes("401")) return false;
      if (error instanceof Error && error.message.includes("403")) return false;
      if (error instanceof Error && error.message.includes("404")) return false;
      return failureCount < 2;
    },
    // Add a placeholder/fallback data
    placeholderData: {
      score: 0,
      min: 300,
      max: 850,
      lastUpdated: new Date().toISOString(),
      bureau: "Equifax",
      status: "pending" as "active" | "pending" | "error" | "no_score",
    },
  });
};
