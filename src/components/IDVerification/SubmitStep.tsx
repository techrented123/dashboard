import React, { useState } from "react";
import { Shield, CheckCircle, Loader, FileText, User } from "lucide-react";

interface UserData {
  idPhoto: string | null;
  selfiePhoto: string | null;
}

interface SubmitStepProps {
  onBack: () => void;
  onComplete: (success: boolean, result: any) => void;
  userData: UserData;
}

const SubmitStep: React.FC<SubmitStepProps> = ({
  onBack,
  onComplete,
  userData,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      setIsSubmitting(true);
      const response = await fetch(
        "https://yvgiflfde4.execute-api.us-west-2.amazonaws.com/verify-identity",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idImage: userData.idPhoto,
            selfieImage: userData.selfiePhoto,
          }),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message);
      }

      const { verificationData, isVerified } = await response.json();

      onComplete(isVerified, verificationData.aditionalData);
    } catch (err) {
      setIsSubmitting(false);
      console.log(
        "Verification error:",
        err instanceof Error ? err.message : "Something Unexpected happened"
      );
      onComplete(false, []);
    } finally {
      setIsSubmitting(false);
    }
  };

  /* React.useEffect(() => {
    if (!result.length || !error) return;
    console.log("isVerified", {isVerified, result, error});
    onComplete(isVerified, result);
  }, [result, onComplete, isVerified, error]);
 */
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Review & Submit
        </h2>
        <p className="text-gray-600 max-w-md mx-auto">
          Please review your information before submitting for verification.
        </p>
      </div>

      <div className="space-y-4">
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">
                Government ID
              </h3>
              <p className="text-gray-600 text-sm">
                {userData.idPhoto
                  ? "ID document uploaded successfully"
                  : "No ID uploaded"}
              </p>
              <div className="mt-2 flex items-center text-green-600 text-sm">
                <CheckCircle className="w-4 h-4 mr-1" />
                {userData.idPhoto ? "Verified format" : "Missing"}
              </div>
            </div>
            {userData.idPhoto && (
              <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                <img
                  src={userData.idPhoto}
                  alt="ID preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <User className="w-6 h-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">Selfie Photo</h3>
              <p className="text-gray-600 text-sm">
                {userData.selfiePhoto
                  ? "High-quality selfie captured"
                  : "No selfie taken"}
              </p>
              <div className="mt-2 flex items-center text-green-600 text-sm">
                <CheckCircle className="w-4 h-4 mr-1" />
                {userData.selfiePhoto ? "Face clearly visible" : "Missing"}
              </div>
            </div>
            {userData.selfiePhoto && (
              <div className="w-16 h-16 rounded-full overflow-hidden border border-gray-200">
                <img
                  src={userData.selfiePhoto}
                  alt="Selfie preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start space-x-3">
          <Shield className="w-6 h-6 text-blue-600 mt-1" />
          <div>
            <h4 className="font-semibold text-blue-900 mb-2">
              Security & Privacy
            </h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Your data is encrypted and stored securely</li>
              <li>• Information is used solely for identity verification</li>
              <li>• We comply with all privacy regulations</li>
            </ul>
          </div>
        </div>
      </div>

      {!isSubmitting ? (
        <div className="flex md:flex-row md:space-x-4 flex-col-reverse gap-3">
          <button
            onClick={onBack}
            className="flex-1 bg-gray-200 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
          >
            Back
          </button>

          <button
            onClick={handleSubmit}
            //disabled={!userData.idPhoto || !userData.selfiePhoto}
            className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            Submit for Verification
          </button>
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-8">
          <div className="flex items-center justify-center space-x-3">
            <Loader className="w-6 h-6 text-blue-600 animate-spin" />
            <span className="text-blue-900 font-semibold">
              Processing verification...
            </span>
          </div>
          <div className="mt-4">
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full animate-pulse"
                style={{ width: "60%" }}
              ></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubmitStep;
