import React, { useState, useRef, useEffect } from "react";
import { Camera, RotateCcw, CheckCircle, User } from "lucide-react";

interface SelfieStepProps {
  onNext: () => void;
  onBack: () => void;
  onPhotoUpdate: (photoData: string) => void;
  existingPhoto: string | null;
}

const SelfieStep: React.FC<SelfieStepProps> = ({
  onNext,
  onBack,
  onPhotoUpdate,
  existingPhoto,
}) => {
  const [photo, setPhoto] = useState<string | null>(existingPhoto);
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (existingPhoto) {
      setPhoto(existingPhoto);
    } else {
      startCamera();
    }
  }, [existingPhoto]);

  const handlePhotoUpdate = (photoData: string) => {
    setPhoto(photoData);
    onPhotoUpdate(photoData);
  };

  const startCamera = async () => {
    setIsCapturing(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      setIsCapturing(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const photoData = canvas.toDataURL("image/jpeg");
        handlePhotoUpdate(photoData);

        // Stop the camera
        const stream = videoRef.current.srcObject as MediaStream;
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }
        setIsCapturing(false);
      }
    }
  };

  const retakePhoto = () => {
    setPhoto(null);
    onPhotoUpdate("");
    startCamera();
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl md:text-3xl font-bold text-gray-900 mb-2">
          Take Your Selfie
        </h2>
        <p className="text-gray-600 max-w-md mx-auto">
          Position your face in the center of the frame and make sure
          you&apos;re in a well-lit area.
        </p>
      </div>

      <div className="relative mx-auto max-w-xs">
        {isCapturing && (
          <div className="relative aspect-square rounded-full overflow-hidden border-4 border-blue-500 shadow-xl">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 border-4 border-blue-500 rounded-2xl pointer-events-none"></div>
          </div>
        )}

        {photo && (
          <div className="relative aspect-square rounded-full overflow-hidden border-4 border-green-500 shadow-xl">
            <img
              src={photo}
              alt="Captured selfie"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 right-4 bg-green-500 rounded-full p-2">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-center space-x-4">
        {!photo && !isCapturing && (
          <button
            onClick={startCamera}
            className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-[#32429b] text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            <Camera className="w-5 h-5" />
            <span>Start Camera</span>
          </button>
        )}

        {isCapturing && (
          <button
            onClick={capturePhoto}
            className="bg-white border-4 border-blue-500 rounded-full p-4 hover:bg-blue-50 transition-colors shadow-lg"
          >
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"></div>
          </button>
        )}

        {photo && (
          <button
            onClick={retakePhoto}
            className="flex items-center space-x-2 bg-gray-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Retake</span>
          </button>
        )}
      </div>

      <div className="flex flex-col-reverse justify-center items-center gap-3  md:flex-row md:space-x-4">
        <button
          onClick={onBack}
          className="flex-1 w-full !mt-3 md:mt-0 bg-gray-200 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
        >
          Back
        </button>

        {photo && (
          <button
            onClick={onNext}
            className="flex-1 w-full bg-gradient-to-r from-blue-700 to-purple-700 text-white py-3 px-6 rounded-lg font-semibold  transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            Continue to Submit
          </button>
        )}
      </div>
    </div>
  );
};

export default SelfieStep;
