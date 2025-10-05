import { useState, useEffect, useCallback } from "react";
import { fetchAuthSession } from "aws-amplify/auth";

// Global cache for rent reports with pagination
let rentReportsCache: { [key: string]: any } = {};
let cacheTimestamp: number | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

// Cache invalidation function that can be called from anywhere
export const invalidateRentReportsCache = () => {
  rentReportsCache = {};
  cacheTimestamp = null;
};

// Pagination interface
export interface PaginationInfo {
  currentPage: number;
  limit: number;
  hasNextPage: boolean;
  lastEvaluatedKey: string | null;
  itemCount: number;
}

// Custom hook for managing rent reports with pagination and caching
export const useRentReports = (autoFetch = true) => {
  const [rentReports, setRentReports] = useState<any[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRentReports = useCallback(
    async (
      page = 1,
      limit = 10,
      lastEvaluatedKey?: string,
      showLoading = true
    ) => {
      try {
        // Create cache key for this specific page
        const cacheKey = `${page}-${limit}-${lastEvaluatedKey || "first"}`;
        const now = Date.now();

        // Check if we have valid cached data for this page
        if (
          rentReportsCache[cacheKey] &&
          cacheTimestamp &&
          now - cacheTimestamp < CACHE_DURATION
        ) {
          console.log("Using cached rent reports data for page", page);
          const cachedData = rentReportsCache[cacheKey];
          setRentReports(cachedData.reports);
          setPagination(cachedData.pagination);
          return cachedData;
        }

        if (showLoading) {
          setIsLoading(true);
        }
        setError(null);

        const session = await fetchAuthSession();
        const token = session.tokens?.idToken?.toString();
        if (!token) {
          console.log("User not authenticated, skipping rent reports fetch");
          return { reports: [], pagination: null };
        }

        // Build query parameters
        const queryParams = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        });

        if (lastEvaluatedKey) {
          queryParams.append("lastEvaluatedKey", lastEvaluatedKey);
        }

        const response = await fetch(`/api/rent-reports?${queryParams}`, {
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

        // Update cache for this page
        rentReportsCache[cacheKey] = data;
        cacheTimestamp = now;

        setRentReports(data.reports || []);
        setPagination(data.pagination || null);
        return data;
      } catch (error) {
        console.error("Error fetching rent reports:", error);
        setError(
          error instanceof Error
            ? error.message
            : "Failed to fetch rent reports"
        );
        return { reports: [], pagination: null };
      } finally {
        if (showLoading) {
          setIsLoading(false);
        }
      }
    },
    []
  );

  const refreshRentReports = useCallback(
    async (page = 1, limit = 10) => {
      // Force refresh by invalidating cache first
      invalidateRentReportsCache();
      return await fetchRentReports(page, limit, undefined, true);
    },
    [fetchRentReports]
  );

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch) {
      fetchRentReports(1, 10);
    }
  }, [autoFetch, fetchRentReports]);

  return {
    rentReports,
    pagination,
    isLoading,
    error,
    fetchRentReports,
    refreshRentReports,
    invalidateCache: invalidateRentReportsCache,
  };
};
