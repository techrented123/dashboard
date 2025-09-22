import { useQuery } from "@tanstack/react-query";
import { checkIdVerification } from "../id-verification";

// Hook for checking ID verification status
export const useIdVerification = (email: string, enabled: boolean = false) => {
  return useQuery({
    queryKey: ["idVerification", email],
    queryFn: () => checkIdVerification(email),
    enabled: enabled && email.length > 0 && email.includes("@"),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: () => {
      // Don't retry on errors, just show error state
      return false;
    },
    // Add placeholder data
    placeholderData: {
      status: "pending" as const,
      lastChecked: new Date().toISOString(),
      message: "Checking ID verification...",
    },
  });
};
