import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import LoginForm from "../components/LoginForm";
import { fetchAuthSession, fetchUserAttributes } from "../lib/auth";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [successMessage, setSuccessMessage] = useState("");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const session = await fetchAuthSession();
        if (session && session.tokens) {
          // User is authenticated, check if they're an admin
          const attributes = await fetchUserAttributes();
          const userRole =
            attributes["custom:role"] || attributes["custom:user_role"];

          if (userRole === "admin" || userRole === "Admin") {
            // Admin user - redirect to admin dashboard
            navigate("/admin/dashboard");
            return;
          } else {
            // Regular user - redirect to regular dashboard
            navigate("/dashboard");
            return;
          }
        }
      } catch (error) {
        // User is not authenticated, continue to login form
        console.log("User not authenticated, showing login form");
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuthStatus();
  }, [navigate]);

  // Get success message from navigation state (from registration)
  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
    }
  }, [location.state?.message]);

  const handleLoginSuccess = async () => {
    // After successful login, check if user is admin and redirect accordingly
    try {
      const attributes = await fetchUserAttributes();
      const userRole =
        attributes["custom:role"] || attributes["custom:user_role"];

      if (userRole === "admin" || userRole === "Admin") {
        // Admin user - redirect to admin dashboard
        navigate("/admin/dashboard");
      } else {
        // Regular user - redirect to regular dashboard
        navigate("/dashboard");
      }
    } catch (error) {
      // If we can't check role, default to regular dashboard
      console.error("Error checking user role:", error);
      navigate("/dashboard");
    }
  };

  // Show loading while checking authentication
  if (isCheckingAuth) {
    return (
      <main className="min-h-screen grid place-items-center p-4 bg-gradient-to-b from-white to-primary-50 dark:from-slate-900 dark:to-slate-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            Checking authentication...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen grid place-items-center p-4 bg-gradient-to-b from-white to-primary-50 dark:from-slate-900 dark:to-slate-800">
      <LoginForm
        onSuccess={handleLoginSuccess}
        successMessage={successMessage}
      />
    </main>
  );
}
