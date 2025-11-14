import React, { useState, useRef } from "react";
import {
  Upload,
  Camera,
  FileText,
  CheckCircle,
  X,
  Circle,
  Lightbulb,
} from "lucide-react";
import Tooltip from "./Tooltip";
import { convertFileToBase64 } from "../../lib/utils";

interface IdUploadStepProps {
  onNext: () => void;
  onPhotoUpdate: (idPhotoData: string) => void;
  existingPhoto: string | null;
}
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const greatPhotoTips = () => (
  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
    <div className="flex items-start space-x-3">
      <div>
        <ul className="text-sm text-amber-800 space-y-1">
          <li>• Ensure all text and details are clearly visible</li>
          <li>• Avoid glare and shadows on the ID</li>
          <li>• Keep the ID flat and fill the frame</li>
          <li>• Make sure the photo is not blurry</li>
          <li>• Use good lighting - natural light works best</li>
        </ul>
      </div>
    </div>
  </div>
);

const IdUploadStep: React.FC<IdUploadStepProps> = ({
  onNext,
  onPhotoUpdate,
  existingPhoto,
}) => {
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(
    existingPhoto
  );

  const [fileName, setFileName] = useState<string>("");
  const [fileSize, setFileSize] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string>("");
  const [isPhotoTaken, setIsPhotoTaken] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    if (existingPhoto) {
      setUploadedPhoto(existingPhoto);
    }
  }, [existingPhoto]);

  const validateFile = (file: File): boolean => {
    if (file.size > MAX_FILE_SIZE) {
      setError("File size must be less than 10MB");
      return false;
    }
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file");
      return false;
    }
    /*  const blob = file.slice(0, 8);
    const arrayBuffer = await blob.arrayBuffer();
    const header = new Uint8Array(arrayBuffer);
 */
    setError("");
    return true;
  };

  // 1️⃣ Purely sync:
  const validateFileSync = (file: File): boolean => {
    if (file.size > MAX_FILE_SIZE) {
      setError("File size must be less than 10MB");
      return false;
    }
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file");
      return false;
    }
    setError("");
    return true;
  };

  const checkMagicBytes = (file: File): Promise<boolean> => {
    return file
      .slice(0, 8)
      .arrayBuffer()
      .then((buf) => {
        const h = new Uint8Array(buf);
        const isPng =
          h[0] === 0x89 && h[1] === 0x50 && h[2] === 0x4e && h[3] === 0x47;
        const isJpeg = h[0] === 0xff && h[1] === 0xd8 && h[2] === 0xff;
        if (!isPng && !isJpeg) {
          setError("Only real PNG/JPEG files are allowed.");
          return false;
        }
        return true;
      });
  };

  const handlePhotoUpdate = async (file: File) => {
    try {
      const base64Data = await convertFileToBase64(file);
      setUploadedPhoto(base64Data);
      setFileName(file.name);
      setFileSize(file.size);
      onPhotoUpdate(base64Data);
    } catch (error) {
      console.error("Error converting file to base64:", error);
      setError("Error processing file");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (
      files.length === 1 &&
      validateFile(files[0]) &&
      (await checkMagicBytes(files[0]))
    ) {
      handlePhotoUpdate(files[0]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (
      files &&
      files.length === 1 &&
      validateFile(files[0]) &&
      (await checkMagicBytes(files[0]))
    ) {
      handlePhotoUpdate(files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const startCamera = async () => {
    setIsCapturing(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Use rear camera
        },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      setError("Unable to access camera. Please check permissions.");
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
        canvas.toBlob(
          async (blob) => {
            if (blob) {
              const file = new File([blob], "id-photo.jpg", {
                type: "image/jpeg",
              });
              if (validateFile(file)) {
                await handlePhotoUpdate(file);
                setIsPhotoTaken(true);
              }
            }
          },
          "image/jpeg",
          0.9
        );

        // Stop the camera
        const stream = videoRef.current.srcObject as MediaStream;
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }
        setIsCapturing(false);
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
    }
    setIsCapturing(false);
  };

  return (
    <div className="space-y-6">
      {isCapturing ? (
        <div className="flex justify-center md:justify-end items-center w-full">
          <Tooltip text={greatPhotoTips()}>
            <h4 className="font-semibold cursor-default text-xs md:text-sm text-amber-900 md:mb-2 flex items-center gap-1 ">
              <Lightbulb className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              Tips for a Great ID Photo
            </h4>
          </Tooltip>
        </div>
      ) : (
        <div className="text-center space-y-3">
          <h2 className="text-xl md:text-3xl font-bold text-gray-900 mb-2">
            Upload Your ID
          </h2>
          <p className="text-gray-600 max-w-md mx-auto">
            Please upload a clear photo of your government-issued ID. We accept
            driver&apos;s licenses, passports, and state IDs.
          </p>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center md:text-left">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {!uploadedPhoto && !isCapturing && (
        <div
          className={`hidden md:block border-2 border-dashed rounded-xl p-8 md:p-16 text-center transition-all duration-300 cursor-pointer ${
            isDragging
              ? "border-blue-500 bg-blue-50 scale-105"
              : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerFileInput}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".png, .jpg, .jpeg"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="space-y-4">
            <div className="mx-auto w-10 h-10 md:w-16 md:h-16 bg-gradient-to-r from-blue-700 to-purple-700 rounded-full flex items-center justify-center">
              <Upload className="w-5 h-5 md:w-8 md:h-8 text-white" />
            </div>
            <div>
              <p className="md:text-lg font-semibold text-gray-900">
                Drop your ID here
              </p>
              <p className="text-sm text-gray-500">
                or click to browse files (max 10MB)
              </p>
            </div>
          </div>
        </div>
      )}

      {isCapturing && (
        <div className="space-y-4">
          <div className="relative mx-auto max-w-md md:max-w-lg w-full">
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border-4 border-blue-500 shadow-xl">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 border-1 md:border-2 border-blue-500 rounded-2xl pointer-events-none">
                <div className="absolute top-2 left-2 w-8 h-8 border-l-4 border-t-4 border-blue-500"></div>
                <div className="absolute top-2 right-2 w-8 h-8 border-r-4 border-t-4 border-blue-500"></div>
                <div className="absolute bottom-2 left-2 w-8 h-8 border-l-4 border-b-4 border-blue-500"></div>
                <div className="absolute bottom-2 right-2 w-8 h-8 border-r-4 border-b-4 border-blue-500"></div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col-reverse gap-3 md:gap-5 justify-center items-center md:space-x-8">
            <button
              onClick={stopCamera}
              className="flex w-full  items-center justify-center h-10 mt-3 md:mt-0 md:h-12 space-x-2 bg-gray-200 text-gray-700 px-2 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
            >
              <X className="w-5 h-5" />
              <span className="text-sm">Cancel</span>
            </button>

            <button
              onClick={capturePhoto}
              className="bg-white border-4 border-blue-500 rounded-full p-4 hover:bg-blue-50 transition-colors shadow-lg"
            >
              <div className="w-9 h-9 md:w-12 md:h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"></div>
            </button>
          </div>
        </div>
      )}

      {uploadedPhoto && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 relative">
          <span
            className="absolute top-2 right-2 cursor-pointer text-red-500"
            onClick={() => {
              setUploadedPhoto("");
              setFileName("");
              setFileSize(0);
              onPhotoUpdate("");
            }}
          >
            <Circle className="w-4 h-4 md:w-5 md:h-5" />
          </span>
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div>
              <p className="font-semibold text-green-900">{fileName}</p>
              <p className="text-sm text-green-600">
                {isPhotoTaken ? "Image captured" : "File uploaded"} successfully
                ({(fileSize / (1024 * 1024)).toFixed(1)}MB)
              </p>
            </div>
          </div>
        </div>
      )}

      {!isCapturing && !uploadedPhoto && (
        <div className="grid md:grid-cols-2 gap-4">
          <button
            onClick={triggerFileInput}
            className="flex items-center justify-center space-x-2 p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText className="w-5 h-5 text-gray-600" />
            <span className="text-gray-700">Choose File</span>
          </button>

          <button
            onClick={startCamera}
            className="flex items-center justify-center space-x-2 p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Camera className="w-5 h-5 text-gray-600" />
            <span className="text-gray-700">Take Photo</span>
          </button>
        </div>
      )}

      {uploadedPhoto && !isCapturing && (
        <button
          onClick={onNext}
          className="w-full bg-gradient-to-r text-white py-3 px-6 rounded-lg font-semibold from-blue-700 to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
        >
          Continue to Selfie
        </button>
      )}
    </div>
  );
};

export default IdUploadStep;
