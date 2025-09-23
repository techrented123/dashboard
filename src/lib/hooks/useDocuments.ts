import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAuthSession } from "aws-amplify/auth";

// Interface for document data
export interface Document {
  docId: string;
  filename: string;
  createdAt: string;
  updatedAt: string;
  size?: number;
  source?: string;
  s3Key?: string; // For lease agreement from Cognito
}

// Function to fetch documents from API and include lease agreement from Cognito
async function fetchDocuments(): Promise<Document[]> {
  const session = await fetchAuthSession();
  const token = session.tokens?.idToken?.toString();

  if (!token) {
    throw new Error("User not authenticated");
  }

  const baseUrl = import.meta.env.VITE_DOCS_API_BASE_URL || "/api";
  const response = await fetch(`${baseUrl}/documents`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Documents API error:", response.status, errorText);
    throw new Error(`Failed to fetch documents: ${response.status}`);
  }

  const data = await response.json();
  console.log("Documents API response:", data);

  // Handle different response structures
  let apiDocs: Document[] = [];
  if (Array.isArray(data)) {
    apiDocs = data;
  } else if (data.documents && Array.isArray(data.documents)) {
    apiDocs = data.documents;
  } else if (data.data && Array.isArray(data.data)) {
    apiDocs = data.data;
  } else {
    console.warn("Unexpected documents API response structure:", data);
    apiDocs = [];
  }

  // Lease agreements are now stored in DynamoDB and will be included in the API response
  // No need for separate Cognito handling

  return apiDocs;
}

// Hook for fetching documents
export const useDocuments = () => {
  return useQuery({
    queryKey: ["documents"],
    queryFn: fetchDocuments,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      // Don't retry on auth errors
      if (error instanceof Error && error.message.includes("401")) return false;
      if (error instanceof Error && error.message.includes("403")) return false;
      return failureCount < 2;
    },
  });
};

// Hook for deleting documents with cache invalidation
export const useDeleteDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (docId: string) => {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();

      if (!token) {
        throw new Error("User not authenticated");
      }

      const baseUrl = import.meta.env.VITE_DOCS_API_BASE_URL || "/api";
      const response = await fetch(`${baseUrl}/documents/${docId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete document");
      }

      return true;
    },
    onSuccess: () => {
      // Invalidate and refetch documents
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
};
