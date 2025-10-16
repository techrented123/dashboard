// src/pages/AdminLoginPage.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../ui/input";
import Card from "../components/Card";
import { signInUser, fetchAuthSession, fetchUserAttributes } from "../lib/auth";

// Check if user has admin role
const checkAdminRole = async (email: string): Promise<boolean> => {
  try {
    const attributes = await fetchUserAttributes();
    // Check for admin role in custom attributes
    const userRole =
      attributes["custom:role"] || attributes["custom:user_role"];
    const isAdmin = userRole === "admin" || userRole === "Admin";

    console.log("🔐 AdminLogin: Checking admin role", {
      email,
      userRole,
      isAdmin,
    });
    return isAdmin;
  } catch (error) {
    console.error("Error checking admin role:", error);
    return false;
  }
};

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      if (email && password) {
        // Use the same sign-in function as regular users
        const result = await signInUser(email, password);

        if (result.kind === "DONE") {
          // Check if user has admin role
          const isAdmin = await checkAdminRole(email);

          if (isAdmin) {
            // Store admin token (using the same token as regular users)
            const session = await fetchAuthSession();
            const token = session.tokens?.idToken?.toString();

            if (token) {
              localStorage.setItem("adminToken", token);
              console.log("🔐 AdminLogin: Admin login successful", {
                email,
                token: token.substring(0, 20) + "...",
              });

              // Navigate to admin dashboard
              navigate("/admin/dashboard");
            } else {
              console.error("🔐 AdminLogin: No token available from session");
              setError("Authentication token not available. Please try again.");
            }
          } else {
            setError("Access denied. Admin privileges required.");
          }
        } else if (result.kind === "MFA") {
          console.log("🔐 AdminLogin: MFA required", result);
          // Check if it's actually a password change requirement
          if (result.channel === "EMAIL") {
            // Redirect to password reset page for password change
            navigate("/admin/password-reset", { state: { email } });
          } else {
            setError(
              "Multi-factor authentication required. Please contact support."
            );
          }
        } else if (result.kind === "NEW_PASSWORD_REQUIRED") {
          // Redirect to password reset page
          navigate("/admin/password-reset", { state: { email } });
        } else {
          setError(
            result.message || "Login failed. Please check your credentials."
          );
        }
      } else {
        setError("Please enter both email and password");
      }
    } catch (err) {
      console.error("Admin login error:", err);
      setError("Login error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
            Admin Login
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Sign in to access the admin dashboard
          </p>
        </div>

        <Card title="">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Email Address
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1"
                placeholder="admin@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1"
                placeholder="Enter your password"
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 dark:bg-red-900/30 p-3 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isLoading ? "Signing in..." : "Sign in"}
              </Button>
            </div>
          </form>
        </Card>

        <div className="text-center">
          <button
            onClick={() =>
              navigate("/admin/password-reset", { state: { email } })
            }
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            Forgot password? Reset here
          </button>
        </div>

        <div className="text-center">
          <button
            onClick={() => navigate("/login")}
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            ← Back to User Login
          </button>
        </div>
      </div>
    </div>
  );
}
