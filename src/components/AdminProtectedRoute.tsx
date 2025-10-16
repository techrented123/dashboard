// src/components/AdminProtectedRoute.tsx
import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAdminAuth } from "../lib/context/adminAuthContext";

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

export default function AdminProtectedRoute({
  children,
}: AdminProtectedRouteProps) {
  const { isAdminAuthenticated, isLoading } = useAdminAuth();
  const location = useLocation();

  useEffect(() => {
    console.log("🔒 AdminProtectedRoute: Checking admin authentication", {
      isAdminAuthenticated,
      isLoading,
      path: location.pathname,
    });
  }, [isAdminAuthenticated, isLoading, location.pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAdminAuthenticated) {
    console.log("🔒 AdminProtectedRoute: Redirecting to admin login");
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  console.log("🔒 AdminProtectedRoute: Admin authenticated, rendering content");
  return <>{children}</>;
}
