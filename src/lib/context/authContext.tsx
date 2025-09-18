import {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from "react";
import { fetchUserAttributes, getCurrentUser } from "aws-amplify/auth";

// Define the types for our context
interface User {
  email?: string;
  name?: string;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthProviderProps {
  children: ReactNode;
}

// 1. Create the context
const AuthContext = createContext<AuthContextType | null>(null);

/**
 * This is the provider component that will wrap your entire application.
 * It handles fetching and storing the user's authentication state and attributes.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null); // Will hold the user attributes
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // This function runs once when the app loads to check the session
    const checkAuthStatus = async () => {
      try {
        // Check if a user is currently signed in
        await getCurrentUser();
        const attributes = await fetchUserAttributes();
        console.log({ attributes });
        setUser(attributes);
        setIsAuthenticated(true);
      } catch (error) {
        // If there's an error, it means no user is signed in
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const value = { user, isAuthenticated, isLoading };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * This is the custom hook that your components will use to access the auth state.
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
