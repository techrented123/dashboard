import React, { useState, useEffect } from "react";
import {
  CheckCircle,
  XCircle,
  Download,
  FileText,
  RotateCcw,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import {
  generateVerificationReport,
  storePDFAndSendEmail,
} from "../../lib/IdVerificationActions";
import { useEmail } from "../../lib/context/EmailContext";
import { VerificationResultDataType } from "../../types";
import jsPDF from "jspdf";
import ModalAlert, { ModalAlertHandle } from "./ModalAlert";
import Toast from "./Toast";
import { useNavigate } from "react-router-dom";

interface ResultStepProps {
  isSuccess: boolean;
  verificationResultData: {
    verificationData: VerificationResultDataType[];
    idImage: string | null;
  };
  onRestart: () => void;
  activeToken: string;
}

const ResultStep: React.FC<ResultStepProps> = ({
  isSuccess,
  onRestart,
  verificationResultData,
  activeToken,
}) => {
  const navigate = useNavigate();
  const { email: contextEmail } = useEmail();
  const [isAutoEmailSent, setIsAutoEmailSent] = useState(false); // Track if auto-email was sent
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState(""); // Store toast message

  const [emailDetails, setEmailDetails] = useState({
    first_name: "",
    last_name: "",
    blob: typeof Blob !== "undefined" ? new Blob() : undefined,
  });
  const [pdfDoc, setPdfDoc] = useState<jsPDF | null>();

  const serverErrorMessage: string | null = null;
  const alertRef = React.useRef<ModalAlertHandle>(null);

  const handleDownload = async () => {
    // Download the PDF locally
    pdfDoc?.save(
      `Rented123 ID_Verification_Report_${emailDetails.last_name}.pdf`
    );
  };

  const progressToNextStep = async () => {
    // Download the PDF locally
    navigate("/register/?plan=silver");
  };
  const preparePDF = React.useCallback(async () => {
    const { doc, blob, first_name, last_name } =
      await generateVerificationReport(verificationResultData, activeToken);
    setEmailDetails({ first_name, last_name, blob });
    setPdfDoc(doc);
  }, [verificationResultData, activeToken]);

  // Automatically send email when PDF is ready and we have a valid email
  useEffect(() => {
    const autoSendEmail = async () => {
      // Only auto-send if PDF is ready and we have an email, and we haven't sent yet
      if (
        emailDetails.blob /* && contextEmail */ &&
        !isAutoEmailSent &&
        isSuccess
      ) {
        try {
          // Send to both the user and reports@rented123.com
          await storePDFAndSendEmail(
            {
              last_name: emailDetails.last_name,
              first_name: emailDetails.first_name,
            },
            emailDetails.blob,
            [contextEmail || "tambi@rented123.com", "reports@rented123.com"]
          );

          console.log("Email sent successfully");
          setIsAutoEmailSent(true); // Prevent duplicate sends
          setToastMessage(`Verification report sent to ${contextEmail}`);
          setShowToast(true); // Show toast notification
        } catch (error) {
          console.error("Failed to auto-send email:", error);
          setToastMessage(
            "Failed to send email automatically. Please try sending it manually."
          );
          setShowToast(true); // Show error toast
        }
      }
    };

    autoSendEmail();
  }, [
    emailDetails.blob,
    contextEmail,
    emailDetails.last_name,
    emailDetails.first_name,
    isAutoEmailSent,
  ]);

  useEffect(() => {
    if (isSuccess) {
      preparePDF();
    }
  }, [isSuccess, preparePDF]);
  console.log("emailDetails", emailDetails, isSuccess, contextEmail);
  // Automatically send email when PDF is ready and we have a valid email

  if (isSuccess) {
    return (
      <>
        {showToast && (
          <Toast
            message={toastMessage}
            onClose={() => setShowToast(false)}
            duration={3000}
          />
        )}
        <div className="space-y-6">
          <div className="text-center">
            <div className="mx-auto w-24 h-24 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mb-6 animate-pulse">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>

            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Verification Successful!
            </h2>
            {!serverErrorMessage ? (
              <div className="max-w-lg mx-auto">
                <p className="text-gray-600 mb-3 ">
                  Your identity has been successfully verified and an email has
                  been sent to you. You can now continue to the next step.
                </p>
              </div>
            ) : (
              <p className="text-red-600 max-w-md mx-auto">
                Although your identity has been successfully verified, there was
                a problem generating the PDF report. Please try again or{" "}
                <a
                  href="mailto:tech@rented123.com;tambi@rented123.com"
                  style={{ textDecoration: "underline" }}
                >
                  contact us
                </a>
              </p>
            )}
          </div>

          <div className="flex space-x-3">
            <button
              onClick={progressToNextStep}
              disabled={!isSuccess}
              className="disabled:cursor-not-allowed disabled:bg-none flex-1 flex items-center justify-center space-x-2  bg-blue-500 text-white py-3 px-4 rounded-lg font-semibold hover:blue-700 transition-all duration-300 shadow-lg"
            >
              <ArrowRight className="w-5 h-5" />
              <span>Continue</span>
            </button>
          </div>
          <div className="max-w-lg mx-auto mt-4">
            <p className="text-gray-600 mb-3 ">
              You can also download the verification report for your records.
            </p>
          </div>
          {/* PDF Download Card */}
          <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-lg">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    ID Verification Report
                  </h3>
                  <p className="text-sm text-gray-500">
                    Generated on {new Date().toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button
                onClick={handleDownload}
                disabled={!isSuccess}
                className="disabled:cursor-not-allowed disabled:bg-none flex items-center justify-center space-x-2 bg-blue-500 text-white py-3 px-4 rounded-lg font-semibold hover:blue-700 transition-all duration-300 shadow-lg"
              >
                <Download className="w-5 h-5" />
                <span>Download PDF</span>
              </button>
            </div>
          </div>

          <ModalAlert ref={alertRef} />
        </div>
      </>
    );
  }

  // Unsuccessful verification
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto w-12 h-12 md:w-24 md:h-24 bg-gradient-to-r from-red-500 to-pink-600 rounded-full flex items-center justify-center mb-6">
          <XCircle className="w-6 h-6 md:w-12 md:h-12 text-white" />
        </div>

        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Verification Failed
        </h2>
        <p className="text-gray-600 max-w-md mx-auto">
          We were unable to verify your identity. Please review the issues below
          and try again.
        </p>
      </div>

      {/* Error Details */}
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-xl px-6 py-4">
          <div className="flex items-start space-x-3">
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 mb-3">
                Possible Issues:
              </h3>
              <ul className="space-y-2 text-sm text-red-800">
                <li className="flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 mt-1 flex-shrink-0" />
                  <span>
                    Document quality too low - text appears blurry or unclear
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 mt-1 flex-shrink-0" />
                  <span>
                    Facial recognition confidence below threshold (67% - minimum
                    85% required)
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 mt-1 flex-shrink-0" />
                  <span>
                    Glare detected on document surface affecting readability
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 mt-1 flex-shrink-0" />
                  <span>
                    Check the expiry date. Your ID might have expired{" "}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Improvement Tips */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h4 className="font-semibold text-blue-900 mb-3">
            Tips for Better Results:
          </h4>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start space-x-2">
              <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <span>Ensure your ID is well-lit with natural lighting</span>
            </li>
            <li className="flex items-start space-x-2">
              <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <span>Hold the camera steady and avoid blurry photos</span>
            </li>
            <li className="flex items-start space-x-2">
              <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <span>Remove any glare or reflections from the document</span>
            </li>
            <li className="flex items-start space-x-2">
              <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <span>Look directly at the camera for your selfie</span>
            </li>
            <li className="flex items-start space-x-2">
              <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <span>Ensure your face is clearly visible and well-lit</span>
            </li>
            <li className="flex items-start space-x-2">
              <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <span>
                For more tips, click{" "}
                <a
                  href="https://docs.regulaforensics.com/develop/doc-reader-sdk/overview/image-quality-requirements/"
                  className="underline"
                  target="_blank"
                >
                  here
                </a>
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div className="flex space-x-4">
        <button
          onClick={onRestart}
          className="flex-1 flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-700 to-purple-700 text-white py-3 px-6 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg"
        >
          <RotateCcw className="w-5 h-5" />
          <span>Try Again</span>
        </button>
      </div>

      {/* Support Section */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
        <h4 className="font-semibold text-gray-900 mb-2">Need Help?</h4>
        <p className="text-sm text-gray-600 mb-4">
          If you continue to experience issues, our support team is here to
          help.
        </p>
        <button className="bg-gray-700 text-white py-2 px-6 rounded-lg font-medium hover:bg-gray-800 transition-colors">
          <a href="mailto:tech@rented123.com;tambi@rented123.com">
            Contact Support
          </a>
        </button>
      </div>
    </div>
  );
};

export default ResultStep;
