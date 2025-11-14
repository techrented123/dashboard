import React, { useState } from "react";
import { ArrowRight } from "lucide-react";
 import { useEmail } from "../../lib/context/EmailContext";

interface EmailCollectionProps {
  onComplete: () => void;
}

const EmailCollection: React.FC<EmailCollectionProps> = ({ onComplete }) => {
  const [email, setEmail] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [emailError, setEmailError] = useState("");
  const { setEmail: setEmailInContext } = useEmail();

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleStartVerification = () => {
    if (!email.trim()) {
      setEmailError("Email address is required");
      return;
    }
    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }
    if (!termsAccepted) {
      setEmailError("Please accept the terms and conditions");
      return;
    }
    setEmailError("");

    // Store email in context
    setEmailInContext(email);

    // Call onComplete to show verification flow
    onComplete();
  };

  const getStepIcon = (stepNumber: number) => {
    switch (stepNumber) {
      case 1:
        return (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );
      case 2:
        return (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );
      case 3:
        return (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-8">
      {/* Main Content Card */}
      <div className="bg-white rounded-2xl shadow-lg p-8 md:p-10 w-full max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src="https://rented123-brand-files.s3.us-west-2.amazonaws.com/logo_white.svg"
            alt="Rented123"
            className="w-[73px] h-auto mx-auto"
          />
        </div>

        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-xl md:text-3xl font-bold text-gray-900 mb-6">
            Verify Your Identity
          </h1>
          <p className="text-gray-600 max-w-md md:max-w-2xl mx-auto text-md">
            To protect your account and ensure a safe experience, we require a
            quick verification process.
          </p>
        </div>

        {/* Verification Steps */}
        <div className="space-y-8 mb-10">
          {/* Step 1 */}
          <div className="flex items-start space-x-4 relative">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <div className="text-blue-600">{getStepIcon(1)}</div>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold  text-gray-900 mb-2">
                Step 1: ID Capture
              </h3>
              <p className="text-gray-700">
                Capture your government-issued ID document.
              </p>
            </div>
            {/* Connecting Line */}
            <div className="absolute left-2 md:top-14 top-14 w-0.5 md:h-8 h-14 bg-gray-200"></div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start space-x-4 relative">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <div className="text-blue-600">{getStepIcon(2)}</div>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Step 2: Selfie
              </h3>
              <p className="text-gray-700">
                Take a selfie for facial recognition.
              </p>
            </div>
            {/* Connecting Line */}
            <div className="absolute left-2 md:top-14 top-14 w-0.5 md:h-8 h-20 bg-gray-200"></div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <div className="text-blue-600">{getStepIcon(3)}</div>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Step 3: Verification Result
              </h3>
              <p className="text-gray-700">Review your verification report.</p>
            </div>
          </div>
        </div>

        {/* Email Collection */}
        <div className="mb-6">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Email Address
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailError("");
            }}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter your email address"
          />
          {emailError ? (
            <p className="mt-2 text-sm text-red-600">{emailError}</p>
          ) : (
            <p className="mt-2 text-sm text-gray-500">
             Ensure the email address entered is correct. We will send you your verification result.
             
            </p>
          )}
        </div>

        {/* Terms and Conditions */}
        <div className="mb-6">
          <label className="flex items-start space-x-3">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => {
                setTermsAccepted(e.target.checked);
                setEmailError("");
              }}
              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">
              I agree to the{" "}
              <a
                href="https://rented123.com/wp-content/uploads/2025/07/Rented123.com-Terms-and-Conditions-link-June302025-RB.docx.pdf"
                target="_blank"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                Terms and Conditions
              </a>{" "}
              and{" "}
              <a
                href="https://rented123.com/privacy-policy/"
                target="_blank"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                Privacy Policy
              </a>
            </span>
          </label>
        </div>

        {/* Call to Action Button */}
        <button
          onClick={handleStartVerification}
          disabled={!email.trim() || !validateEmail(email) || !termsAccepted}
          className="w-full disabled:bg-gray-400 disabled:cursor-not-allowed bg-blue-600 text-white hover:bg-blue-700 font-semibold py-4 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 group"
        >
          <span>Start Verification</span>
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
        </button>

        {/* Additional Info */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Your information is encrypted and secure. We never share your data
            with third parties.
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmailCollection;
