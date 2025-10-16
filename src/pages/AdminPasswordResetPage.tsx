// src/pages/AdminPasswordResetPage.tsx
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../ui/input";
import Card from "../components/Card";
import { forgotPassword } from "../lib/auth";

export default function AdminPasswordResetPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Get the email from the previous page (passed via state or URL params)
  const initialEmail =
    location.state?.email ||
    new URLSearchParams(location.search).get("email") ||
    "";

  // Set initial email if provided
  useState(() => {
    if (initialEmail) {
      setEmail(initialEmail);
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      if (!email) {
        setError("Please enter your email address");
        setIsLoading(false);
        return;
      }

      // Initiate password reset (sends 6-digit code)
      const result = await forgotPassword(email);

      if (result.success) {
        setIsSuccess(true);
        console.log("🔐 AdminPasswordReset: Reset code sent to", email);
      } else {
        setError(
          result.message || "Failed to send reset code. Please try again."
        );
      }
    } catch (err: any) {
      console.error("Admin password reset error:", err);
      setError(err.message || "Failed to send reset code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
              Check Your Email
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              We've sent a password reset code to{" "}
              <span className="font-medium text-gray-900 dark:text-white">
                {email}
              </span>
            </p>
          </div>

          <div className="space-y-4">
            <Button
              onClick={() =>
                navigate("/admin/password-reset-confirm", { state: { email } })
              }
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              Enter Reset Code
            </Button>

            <Button
              onClick={() => navigate("/admin/login")}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white"
            >
              Back to Admin Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
            Reset Admin Password
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Enter your email address to receive a reset code
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
                {isLoading ? "Sending Code..." : "Send Reset Code"}
              </Button>
            </div>
          </form>
        </Card>

        <div className="text-center">
          <button
            onClick={() => navigate("/admin/login")}
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            ← Back to Admin Login
          </button>
        </div>
      </div>
    </div>
  );
}
