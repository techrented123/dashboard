// src/lib/context/adminAuthContext.tsx
import {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from "react";
import { fetchAuthSession, fetchUserAttributes } from "../auth";

// Define the types for admin context
interface AdminUser {
  email?: string;
  name?: string;
  role?: string;
  [key: string]: any;
}

interface AdminAuthContextType {
  adminUser: AdminUser | null;
  isAdminAuthenticated: boolean;
  isLoading: boolean;
  refreshAuth: () => void;
}

interface AdminAuthProviderProps {
  children: ReactNode;
}

// 1. Create the context
const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

/**
 * Admin authentication provider that handles admin login/logout
 */
export function AdminAuthProvider({ children }: AdminAuthProviderProps) {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkAdminAuthStatus = async () => {
    try {
      // First check if there's an admin token
      const adminToken = localStorage.getItem("adminToken");
      console.log("🔐 AdminAuth: Checking admin token:", adminToken);

      // Also check if user is authenticated through regular login
      let session;
      try {
        session = await fetchAuthSession();
        console.log("🔐 AdminAuth: Session found:", !!session?.tokens);
      } catch (error) {
        console.log("🔐 AdminAuth: No session found");
        session = null;
      }

      if (adminToken && session?.tokens) {
        // Check if admin token matches current session
        const currentToken = session.tokens?.idToken?.toString();
        if (currentToken === adminToken) {
          // Admin token is valid, check admin role
          const attributes = await fetchUserAttributes();
          const userRole =
            attributes["custom:role"] || attributes["custom:user_role"];
          const isAdmin = userRole === "admin" || userRole === "Admin";

          if (isAdmin) {
            const adminData = {
              id: attributes.sub,
              email: attributes.email,
              name: attributes.given_name || attributes.name,
              role: "admin",
            };
            setAdminUser(adminData);
            setIsAdminAuthenticated(true);
            console.log(
              "🔐 AdminAuth: Admin authenticated via admin token",
              adminData
            );
            return;
          }
        }
      }

      // If no admin token or token doesn't match, check if user is admin via regular login
      if (session?.tokens) {
        try {
          const attributes = await fetchUserAttributes();
          const userRole =
            attributes["custom:role"] || attributes["custom:user_role"];
          const isAdmin = userRole === "admin" || userRole === "Admin";

          if (isAdmin) {
            // User is admin but logged in through regular login - set admin token
            const currentToken = session.tokens?.idToken?.toString();
            if (currentToken) {
              localStorage.setItem("adminToken", currentToken);
            }

            const adminData = {
              id: attributes.sub,
              email: attributes.email,
              name: attributes.given_name || attributes.name,
              role: "admin",
            };
            setAdminUser(adminData);
            setIsAdminAuthenticated(true);
            console.log(
              "🔐 AdminAuth: Admin authenticated via regular login",
              adminData
            );
            return;
          }
        } catch (error) {
          console.log("🔐 AdminAuth: Error fetching user attributes", error);
        }
      }

      // No valid admin authentication found
      setAdminUser(null);
      setIsAdminAuthenticated(false);
      console.log("🔐 AdminAuth: No valid admin authentication found");
    } catch (error) {
      console.error("🔐 AdminAuth: Error checking auth status", error);
      setAdminUser(null);
      setIsAdminAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Check if admin is logged in on app load
    checkAdminAuthStatus();
  }, []);

  const value = {
    adminUser,
    isAdminAuthenticated,
    isLoading,
    refreshAuth: checkAdminAuthStatus,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

/**
 * Hook to access admin auth state
 */
export function useAdminAuth(): AdminAuthContextType {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return context;
}
