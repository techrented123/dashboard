import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchUserAttributes, updateUserAttributes } from "aws-amplify/auth";

export interface UserAttributes {
  email?: string;
  given_name?: string;
  family_name?: string;
  phone_number?: string;
  address?: string;
  birthdate?: string;
  preferred_username?: string;
}

async function fetchUserAttributesData(): Promise<UserAttributes> {
  const session = await fetchUserAttributes();
  return session;
}

export const useUserAttributes = () => {
  return useQuery({
    queryKey: ["userAttributes"],
    queryFn: fetchUserAttributesData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount: number, error: any) => {
      // Don't retry on auth errors
      if (
        error?.name === "NotAuthorizedException" ||
        error?.name === "UnauthorizedException"
      ) {
        return false;
      }
      return failureCount < 3;
    },
    refetchOnWindowFocus: false,
  });
};

export const useUpdateUserAttributes = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (attributes: Partial<UserAttributes>) => {
      await updateUserAttributes({ userAttributes: attributes });
      return attributes;
    },
    onSuccess: (updatedAttributes) => {
      // Update the cache with the new attributes
      queryClient.setQueryData(
        ["userAttributes"],
        (oldData: UserAttributes) => ({
          ...oldData,
          ...updatedAttributes,
        })
      );
    },
  });
};

