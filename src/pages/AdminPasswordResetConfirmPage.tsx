import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, CheckCircle, Eye, EyeOff } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { forgotPassword, confirmNewPassword } from "../lib/auth";
import { Button } from "../components/ui/button";
import { Input } from "../ui/input";
import { Label } from "../components/ui/label";
import { Toast } from "../components/ui/toast";

// Form validation schema
const formSchema = z
  .object({
    email: z.string().email("Please enter a valid email address"),
    code: z.string().min(6, "Code must be at least 6 characters"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof formSchema>;

const AdminPasswordResetConfirmPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
    isVisible: boolean;
  }>({
    message: "",
    type: "success",
    isVisible: false,
  });

  // Get email from location state or URL params
  const emailFromState = location.state?.email;
  const emailFromParams = new URLSearchParams(location.search).get("email");
  const initialEmail = emailFromState || emailFromParams || "";

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: initialEmail,
      code: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Toast helper functions
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type, isVisible: true });
  };

  const hideToast = () => {
    setToast({ ...toast, isVisible: false });
  };

  const onSubmit = async (data: FormValues) => {
    try {
      setIsLoading(true);
      const result = await confirmNewPassword(
        data.email,
        data.code,
        data.newPassword
      );

      if (result.success) {
        setIsSuccess(true);
        showToast(result.message as string, "success");
        // Redirect to admin dashboard after 3 seconds
        setTimeout(() => {
          navigate("/admin/dashboard");
        }, 3000);
      } else {
        showToast(result.message as string, "error");
      }
    } catch (error) {
      console.error("Admin password reset confirmation error:", error);
      showToast("An unexpected error occurred. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      setIsLoading(true);
      const email = form.getValues("email");
      if (!email) {
        showToast("Please enter your email address first", "error");
        return;
      }

      const result = await forgotPassword(email);
      if (result.success) {
        showToast("Reset code sent to your email", "success");
      } else {
        showToast(result.message || "Failed to send reset code", "error");
      }
    } catch (error) {
      console.error("Error resending code:", error);
      showToast("Failed to resend code. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
              Password Reset Complete
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Your admin password has been successfully updated. You will be
              redirected to the admin dashboard shortly.
            </p>
          </div>

          <div className="space-y-4">
            <Button
              onClick={() => navigate("/admin/dashboard")}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              Go to Admin Dashboard
            </Button>

            <Link
              to="/admin/login"
              className="w-full flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Back to Admin Login
            </Link>
          </div>

          <Toast
            message={toast.message}
            type={toast.type}
            isVisible={toast.isVisible}
            onClose={hideToast}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
            Reset Admin Password
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Enter the 6-digit code sent to your email and set a new password
          </p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <Label
              htmlFor="email"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
              placeholder="admin@example.com"
              {...form.register("email")}
            />
            {form.formState.errors.email && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>

          <div>
            <Label
              htmlFor="code"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Reset Code
            </Label>
            <Input
              id="code"
              type="text"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
              placeholder="Enter the 6-digit code"
              {...form.register("code")}
            />
            {form.formState.errors.code && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {form.formState.errors.code.message}
              </p>
            )}
          </div>

          <div>
            <Label
              htmlFor="newPassword"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              New Password
            </Label>
            <div className="mt-1 relative">
              <Input
                id="newPassword"
                type={showPassword ? "text" : "password"}
                className="block w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                placeholder="Enter new password"
                {...form.register("newPassword")}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>
            {form.formState.errors.newPassword && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {form.formState.errors.newPassword.message}
              </p>
            )}
          </div>

          <div>
            <Label
              htmlFor="confirmPassword"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Confirm New Password
            </Label>
            <div className="mt-1 relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                className="block w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                placeholder="Confirm new password"
                {...form.register("confirmPassword")}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>
            {form.formState.errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {form.formState.errors.confirmPassword.message}
              </p>
            )}
          </div>

          <div className="space-y-4">
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? "Resetting..." : "Reset Password"}
            </Button>

            <Button
              type="button"
              onClick={handleResendCode}
              disabled={isLoading}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white"
            >
              {isLoading ? "Sending..." : "Resend Code"}
            </Button>
          </div>
        </form>

        <div className="text-center">
          <Link
            to="/admin/login"
            className="text-sm text-blue-600 hover:text-blue-500 flex items-center justify-center"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Admin Login
          </Link>
        </div>

        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={toast.isVisible}
          onClose={hideToast}
        />
      </div>
    </div>
  );
};

export default AdminPasswordResetConfirmPage;
