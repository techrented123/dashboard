import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { signInUser, submitMfaCode } from "../lib/auth";
import { Link } from "react-router-dom";
import logo from "../assets/logo.png";

interface LoginFormProps {
  onSuccess?: () => void;
  successMessage?: string;
}

export default function LoginForm({
  onSuccess,
  successMessage,
}: LoginFormProps) {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [mfaCode, setMfaCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [error, setError] = useState("");
  const [showMFA, setShowMFA] = useState(false);
  const [mfaChannel, setMfaChannel] = useState<"SMS" | "EMAIL">("EMAIL");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signInUser(formData.username, formData.password);

    if (result.kind === "DONE") {
      onSuccess?.();
    } else if (result.kind === "MFA") {
      setShowMFA(true);
      setMfaChannel(result.channel as "SMS" | "EMAIL");
    } else if (result.kind === "ERROR") {
      setError(result.message);
    }

    setLoading(false);
  };

  const handleMFASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMfaLoading(true);
    setError("");

    const result = await submitMfaCode(mfaCode);

    if (result.kind === "DONE") {
      onSuccess?.();
    } else if (result.kind === "ERROR") {
      setError(result.message);
    }

    setMfaLoading(false);
  };

  if (showMFA) {
    return (
      <div className="w-full max-w-md">
        {/* Logo outside form */}
        <div className="text-center mb-8">
          <img src={logo} alt="Rented123 Logo" className="h-20 mx-auto" />
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-soft p-6 border dark:border-slate-700">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-semibold text-primary-800 dark:text-primary-300 mb-2">
              Verify Your Identity
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              We've sent a verification code to your {mfaChannel.toLowerCase()}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleMFASubmit} className="space-y-4">
            <div>
              <label className="text-sm block mb-1 dark:text-slate-300">
                Verification Code
              </label>
              <input
                type="text"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                className="w-full rounded-xl border dark:border-slate-600 px-3 py-2 outline-none focus:ring-2 focus:ring-secondary-300 transition-all bg-white dark:bg-slate-700 dark:text-white"
                placeholder="Enter 6-digit code"
                required
              />
            </div>
            <button
              type="submit"
              disabled={mfaLoading}
              className="w-full bg-secondary text-white rounded-xl py-3 font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {mfaLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify & Sign In"
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => setShowMFA(false)}
              className="text-sm text-secondary hover:underline"
            >
              Back to sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      {/* Logo outside form */}
      <div className="text-center mb-8">
        <img src={logo} alt="Rented123 Logo" className="h-[100px] mx-auto" />
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-soft p-6 border dark:border-slate-700">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold text-primary-800 dark:text-primary-300 mb-2">
            Welcome Back
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Sign in to access your dashboard and continue building credit
            through rent payments
          </p>
        </div>
        {successMessage && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl">
            <p className="text-sm text-green-700 dark:text-green-400">
              {successMessage}
            </p>
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm block mb-1 dark:text-slate-300">
              Username or Email
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              className="w-full rounded-xl border dark:border-slate-600 px-3 py-2 outline-none focus:ring-2 focus:ring-secondary-300 transition-all bg-white dark:bg-slate-700 dark:text-white"
              required
            />
          </div>
          <div>
            <label className="text-sm block mb-1 dark:text-slate-300">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full rounded-xl border dark:border-slate-600 px-3 py-2 pr-10 outline-none focus:ring-2 focus:ring-secondary-300 transition-all bg-white dark:bg-slate-700 dark:text-white"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>
        <div className="mt-6 text-center space-y-3">
          <Link
            to="/forgot-password"
            className="text-sm text-secondary hover:underline block"
          >
            Forgot your password?
          </Link>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Don't have an account?{" "}
            <Link to="/register" className="text-secondary hover:underline">
              Sign up
            </Link>
          </p>
        </div>{" "}
      </div>
    </div>
  );
}
