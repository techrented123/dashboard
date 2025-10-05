import { useState, useEffect, useCallback } from "react";
import { fetchAuthSession } from "aws-amplify/auth";

// Global cache for rent reports
let rentReportsCache: any[] | null = null;
let cacheTimestamp: number | null = null;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

// Cache invalidation function that can be called from anywhere
export const invalidateRentReportsCache = () => {
  rentReportsCache = null;
  cacheTimestamp = null;
};

// Custom hook for managing rent reports with caching
export const useRentReports = (autoFetch = true) => {
  const [rentReports, setRentReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRentReports = useCallback(async (showLoading = true) => {
    try {
      const now = Date.now();

      // Check if we have valid cached data
      if (
        rentReportsCache &&
        cacheTimestamp &&
        now - cacheTimestamp < CACHE_DURATION
      ) {
        console.log("Using cached rent reports data");
        setRentReports(rentReportsCache);
        return rentReportsCache;
      }

      if (showLoading) {
        setIsLoading(true);
      }
      setError(null);

      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      if (!token) {
        console.log("User not authenticated, skipping rent reports fetch");
        return [];
      }

      const baseUrl =
        import.meta.env.VITE_RENT_REPORTS_API_BASE_URL ||
        "https://yipdy0po78.execute-api.us-west-2.amazonaws.com/rent-reports";

      const response = await fetch(baseUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch rent reports");
      }

      const data = await response.json();
      console.log("Rent reports fetched from API:", data);

      // Update cache
      rentReportsCache = data.reports || [];
      cacheTimestamp = now;

      setRentReports(data.reports || []);
      return data.reports || [];
    } catch (error) {
      console.error("Error fetching rent reports:", error);
      setError(
        error instanceof Error ? error.message : "Failed to fetch rent reports"
      );
      return [];
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, []);

  const refreshRentReports = useCallback(async () => {
    // Force refresh by invalidating cache first
    invalidateRentReportsCache();
    return await fetchRentReports(true);
  }, [fetchRentReports]);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch) {
      fetchRentReports();
    }
  }, [autoFetch, fetchRentReports]);

  return {
    rentReports,
    isLoading,
    error,
    fetchRentReports,
    refreshRentReports,
    invalidateCache: invalidateRentReportsCache,
  };
};
