import React, { useState, useCallback, useEffect } from "react";
import ProgressBar from "../components/IDVerification/ProgressBar";
import IdUploadStep from "../components/IDVerification/IdUpload";
import SelfieStep from "../components/IDVerification/SelfieStep";
import SubmitStep from "../components/IDVerification/SubmitStep";
import ResultStep from "../components/IDVerification/ResultStep";
import {
  savePhotoToIndexedDB,
  getPhotoFromIndexedDB,
  clearAllPhotosFromIndexedDB,
} from "../lib/photoStorage";
import { EmailProvider, useEmail } from "../lib/context/EmailContext";
import EmailCollection from "../components/IDVerification/EmailCollection";
import logo from "../assets/logo.png";

// Local types (adjust as needed)
type UserData = {
  idPhoto: string | null;
  selfiePhoto: string | null;
};

type VerificationResultDataType = any; // Narrow this if you have a concrete type

// Local hook to detect mobile width
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 768;
  });
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return isMobile;
}

async function updateToken(token: string): Promise<boolean> {
  try {
    // Placeholder: replace with backend call to mark token complete
    console.log("updateToken called with", token);
    return true;
  } catch {
    return false;
  }
}

async function sendFailedVerificationNotification(payload: {
  first_name: string;
  last_name: string;
  email: string;
}): Promise<void> {
  // Placeholder: replace with backend call
  console.log("sendFailedVerificationNotification", payload);
}

// Minimal QRCode fallback (no external dependency)
function QRCode(props: { url: string; token: string }) {
  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-8 md:p-12">
      <h3 className="text-lg font-semibold mb-4 text-center">
        Open on your mobile device
      </h3>
      <p className="text-sm text-gray-600 text-center mb-4">
        Scan this link or copy it to your phone to continue:
      </p>
      <div className="break-all text-blue-700 underline text-center mb-6">
        <a href={props.url} target="_blank" rel="noreferrer">
          {props.url}
        </a>
      </div>
      <p className="text-xs text-gray-500 text-center">Token: {props.token}</p>
    </div>
  );
}

function IdVerificationProcessContent() {
  // Initialize step from localStorage or default to 1
  const [currentStep, setCurrentStep] = useState(() => {
    if (typeof window !== "undefined") {
      const savedStep = localStorage.getItem("rented123_verification_step");
      return savedStep ? parseInt(savedStep, 10) : 1;
    }
    return 1;
  });
  const [userData, setUserData] = useState<UserData>({
    idPhoto: "",
    selfiePhoto: "",
  });
  const [verificationResult, setVerificationResult] = useState<boolean | null>(
    null
  );
  const [verificationData, setVerificationData] = useState<
    Array<VerificationResultDataType>
  >([]);
  const [failureNotificationSent, setFailureNotificationSent] = useState(false);
  const [tokenUpdated, setTokenUpdated] = useState(false);

  const isMobileDevice = useIsMobile();
  const [activeToken] = useState("");
  const [showQRCode, setShowQRCode] = React.useState(false);

  const totalSteps = 3;

  /* const verifyToken = React.useCallback(
    async (token: string | null) => {
      const activeToken = await getToken(token as string);
      if (!activeToken) {
        navigate("/404");
        setVerifyingToken(false);
      } else if (activeToken.product !== "idscan") {
        navigate("/404");
        setVerifyingToken(false);
      } else {
        setActiveToken(activeToken.token);
        setVerifyingToken(false);
        // Save verified token AND verification status to localStorage
        if (typeof window !== "undefined" && activeToken.token) {
          localStorage.setItem(
            "rented123_verification_token",
            activeToken.token
          );
          localStorage.setItem("rented123_token_verified", "true");
        }
      }
    },
    [navigate]
  );
 */
  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleVerificationComplete = useCallback(
    (success: boolean, data: VerificationResultDataType[]) => {
      setVerificationResult(success);
      setVerificationData(data);
      setCurrentStep(4); // Move to result step
    },
    []
  );

  const restartVerification = useCallback(() => {
    setCurrentStep(1);
    setVerificationResult(null);
    setUserData({
      idPhoto: null,
      selfiePhoto: null,
    });
    setTokenUpdated(false);
    setFailureNotificationSent(false);
    // Clear localStorage and IndexedDB
    if (typeof window !== "undefined") {
      localStorage.removeItem("rented123_verification_step");
      localStorage.removeItem("rented123_verification_email");
      localStorage.removeItem("rented123_verification_token");
      localStorage.removeItem("rented123_token_verified");
      clearAllPhotosFromIndexedDB();
    }
  }, []);

  const updateIdPhoto = useCallback(async (idPhotoData: string) => {
    setUserData((prev) => ({
      ...prev,
      idPhoto: idPhotoData,
    }));
    // Save to IndexedDB
    if (idPhotoData) {
      await savePhotoToIndexedDB("idPhoto", idPhotoData);
    }
  }, []);

  const updateSelfiePhoto = useCallback(async (photoData: string) => {
    setUserData((prev) => ({
      ...prev,
      selfiePhoto: photoData,
    }));
    // Save to IndexedDB
    if (photoData) {
      await savePhotoToIndexedDB("selfiePhoto", photoData);
    }
  }, []);

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <IdUploadStep
            onNext={nextStep}
            onPhotoUpdate={updateIdPhoto}
            existingPhoto={userData.idPhoto}
          />
        );
      case 2:
        return (
          <SelfieStep
            onNext={nextStep}
            onBack={prevStep}
            onPhotoUpdate={updateSelfiePhoto}
            existingPhoto={userData.selfiePhoto}
          />
        );
      case 3:
        return (
          <SubmitStep
            onBack={prevStep}
            onComplete={handleVerificationComplete}
            userData={userData}
          />
        );
      case 4:
        return (
          <ResultStep
            isSuccess={verificationResult || false}
            onRestart={restartVerification}
            verificationResultData={{
              verificationData,
              idImage: userData.idPhoto,
            }}
            activeToken={activeToken}
          />
        );
      default:
        return (
          <IdUploadStep
            onNext={nextStep}
            onPhotoUpdate={updateIdPhoto}
            existingPhoto={userData.idPhoto}
          />
        );
    }
  };

  // Load photos from IndexedDB on mount
  useEffect(() => {
    const loadPhotos = async () => {
      const idPhoto = await getPhotoFromIndexedDB("idPhoto");
      const selfiePhoto = await getPhotoFromIndexedDB("selfiePhoto");
      if (idPhoto || selfiePhoto) {
        setUserData({
          idPhoto: idPhoto || "",
          selfiePhoto: selfiePhoto || "",
        });
      }
    };
    loadPhotos();
  }, []);

  // Save current step to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "rented123_verification_step",
        currentStep.toString()
      );
    }
  }, [currentStep]);

  // Clear localStorage and IndexedDB when verification completes SUCCESSFULLY
  // Also call updateToken to mark the token as complete
  useEffect(() => {
    if (
      verificationResult === true &&
      currentStep === 4 &&
      !tokenUpdated &&
      activeToken
    ) {
      // Call updateToken to mark the token as complete
      updateToken(activeToken)
        .then((result) => {
          if (result) {
            console.log("Token updated successfully");
          } else {
            console.error("Failed to update token");
          }
        })
        .catch((error) => {
          console.error("Error updating token:", error);
        });
      setTokenUpdated(true);

      if (typeof window !== "undefined") {
        localStorage.removeItem("rented123_verification_step");
        localStorage.removeItem("rented123_verification_email");
        localStorage.removeItem("rented123_verification_token");
        localStorage.removeItem("rented123_token_verified");
        clearAllPhotosFromIndexedDB();
      }
    }
  }, [verificationResult, currentStep, tokenUpdated, activeToken]);

  // Send failure notification when verification fails
  useEffect(() => {
    const handleFailedVerification = async () => {
      if (
        verificationResult === false &&
        currentStep === 4 &&
        !failureNotificationSent
      ) {
        try {
          const email = localStorage.getItem("rented123_verification_email");
          const firstName = verificationData.length > 0 ? "User" : "Unknown";
          const lastName = "";

          await sendFailedVerificationNotification({
            first_name: firstName,
            last_name: lastName,
            email: email || "No email provided",
          });

          setFailureNotificationSent(true);
          console.log(
            "Failure notification sent to tambi@rented123.com, sales@rented123.com, rob@rented123.com"
          );
        } catch (error) {
          console.error("Failed to send failure notification:", error);
        }
      }
    };

    handleFailedVerification();
  }, [
    verificationResult,
    currentStep,
    failureNotificationSent,
    verificationData,
  ]);

  /*  React.useEffect(() => {
    const isVerified =
      typeof window !== "undefined"
        ? localStorage.getItem("rented123_token_verified") === "true"
        : false;
    const storedToken =
      typeof window !== "undefined"
        ? localStorage.getItem("rented123_verification_token")
        : null;

    const tokenToUse = token || storedToken;

    if (!tokenToUse) {
      navigate("/404");
    } else if (!token && isVerified && storedToken) {
      // If using stored verified token, set it directly without re-verifying
      setActiveToken(storedToken);
      setVerifyingToken(false);
    } else if (token) {
      // New token from URL, verify it
      //verifyToken(token);
    }
  }, [token, navigate]);
 */
  return (
    <div className="min-h-[80vh] md:min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <img src={logo} alt="Rented123" className="h-16 inline-block" />
        </div>
        {showQRCode ? (
          <QRCode
            url={`https://services.idscan.rented123.com/`}
            token={activeToken}
          />
        ) : (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 md:pt-6">
              {!isMobileDevice && currentStep === 1 && !showQRCode && (
                <h4
                  className="font-semibold text-center text-sm cursor-pointer underline mb-6"
                  onClick={() => {
                    setShowQRCode(true);
                  }}
                >
                  Switch to a mobile device
                </h4>
              )}
              {currentStep <= 3 && (
                <ProgressBar
                  currentStep={currentStep}
                  totalSteps={totalSteps}
                />
              )}
              {renderStep()}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-12">
          <p className="text-sm text-gray-500">
            Powered by Rented123 AI technology •{" "}
            <a
              href="https://rented123.com/privacy-policy"
              target="_blank"
              className="underline"
            >
              Privacy Policy{" "}
            </a>
            •{" "}
            <a
              href="https://rented123.com/terms-and-conditions"
              target="_blank"
              className="underline"
            >
              Terms of Use{" "}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function IdVerificationProcessPage() {
  return (
    <EmailProvider>
      <IdVerificationGate />
    </EmailProvider>
  );
}

function IdVerificationGate() {
  const { email } = useEmail();
  const [hasCollectedEmail, setHasCollectedEmail] = useState(Boolean(email));

  useEffect(() => {
    setHasCollectedEmail(Boolean(email));
  }, [email]);

  if (!hasCollectedEmail) {
    return (
      <EmailCollection
        onComplete={() => {
          setHasCollectedEmail(true);
        }}
      />
    );
  }

  return <IdVerificationProcessContent />;
}
