import React from "react";

interface SkeletonProps {
  className?: string;
  children?: React.ReactNode;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = "",
  children,
}) => {
  return (
    <div
      className={`animate-pulse bg-slate-200 dark:bg-slate-700 rounded ${className}`}
    >
      {children}
    </div>
  );
};

// Predefined skeleton components for common use cases
export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({
  lines = 1,
  className = "",
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={`h-4 ${index === lines - 1 ? "w-3/4" : "w-full"}`}
        />
      ))}
    </div>
  );
};

export const SkeletonCard: React.FC<{ className?: string }> = ({
  className = "",
}) => {
  return (
    <div className={`p-4 space-y-3 ${className}`}>
      <Skeleton className="h-6 w-1/3" />
      <SkeletonText lines={2} />
      <Skeleton className="h-8 w-24" />
    </div>
  );
};

export const SkeletonCircle: React.FC<{
  size?: string;
  className?: string;
}> = ({ size = "h-8 w-8", className = "" }) => {
  return <Skeleton className={`rounded-full ${size} ${className}`} />;
};

export const SkeletonButton: React.FC<{ className?: string }> = ({
  className = "",
}) => {
  return <Skeleton className={`h-10 w-24 rounded-lg ${className}`} />;
};

