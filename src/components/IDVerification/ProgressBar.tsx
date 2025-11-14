import React from "react";

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  currentStep,
  totalSteps,
}) => {
  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between mb-2">
        {Array.from({ length: totalSteps }, (_, index) => (
          <div key={index} className="flex flex-col items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                index + 1 <= currentStep
                  ? "bg-gradient-to-r from-blue-700 to-purple-700 text-white shadow-lg"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              {index + 1}
            </div>
            <div className="mt-2 text-xs text-gray-600 text-center">
              {index === 0 && "ID Upload"}
              {index === 1 && "Selfie"}
              {index === 2 && "Submit"}
            </div>
          </div>
        ))}
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-gradient-to-r from-blue-700 to-purple-700 h-2 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${(currentStep / totalSteps) * 100}%` }}
        ></div>
      </div>
    </div>
  );
};

export default ProgressBar;
