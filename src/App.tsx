import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterUserInfoPage from "./pages/RegisterUserInfoPage";
import RegisterBillingPage from "./pages/RegisterBillingPage";
import RegisterConfirmPage from "./pages/RegisterConfirmPage";
import SubscribePage from "./pages/SubscribePage";
import DashboardPage from "./pages/DashboardPage";
import RentReportingPage from "./pages/RentReportingPage";
import RentReportingMagicLinkPage from "./pages/RentReportingMagicLinkPage";
import BackRentReportingPage from "./pages/BackRentReportingPage";
import BackRentReportingPurchasePage from "./pages/BackRentReportingPurchasePage";
import BackRentReportingPublicPurchasePage from "./pages/BackRentReportingPublicPurchasePage";
import BackRentReportingPublicPage from "./pages/BackRentReportingPublicPage";
import CheckEmailPage from "./pages/CheckEmailPage";
import PricingPlansPage from "./pages/PricingPlansPage";
import BillingPage from "./pages/BillingPage";
import DocumentsPage from "./pages/DocumentsPage";
import AccountPage from "./pages/AccountPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ConfirmPasswordResetPage from "./pages/ConfirmPasswordResetPage";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminPasswordResetPage from "./pages/AdminPasswordResetPage";
import AdminPasswordResetConfirmPage from "./pages/AdminPasswordResetConfirmPage";
import AdminRentReportsPage from "./pages/AdminRentReportsPage";
import AdminProtectedRoute from "./components/AdminProtectedRoute";
import { useState, useEffect } from "react";
import { isAuthenticated } from "./lib/auth";

function App() {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const authStatus = await isAuthenticated();
      setAuthenticated(authStatus);
      setLoading(false);
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          <Navigate to={authenticated ? "/dashboard" : "/login"} replace />
        }
      />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route
        path="/confirm-password-reset"
        element={<ConfirmPasswordResetPage />}
      />
      <Route path="/pricing-plans" element={<PricingPlansPage />} />
      <Route path="/register" element={<RegisterUserInfoPage />} />
      <Route path="/register/billing" element={<RegisterBillingPage />} />
      <Route path="/register/confirm" element={<RegisterConfirmPage />} />
      <Route
        path="/subscribe"
        element={
          <ProtectedRoute requireSubscription={false}>
            <SubscribePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/rent-reporting"
        element={
          <ProtectedRoute>
            <RentReportingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/rent-reporting-magic-link"
        element={<RentReportingMagicLinkPage />}
      />
      {/* Public routes - completely different URL */}
      <Route
        path="/public-purchase/back-rent-report"
        element={<BackRentReportingPublicPurchasePage />}
      />
      <Route path="/check-email" element={<CheckEmailPage />} />
      <Route
        path="/public-form/back-rent-report"
        element={<BackRentReportingPublicPage />}
      />
      <Route
        path="/back-rent-reporting"
        element={
          <ProtectedRoute>
            <BackRentReportingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/back-rent-reporting/purchase"
        element={
          <ProtectedRoute requireSubscription={false}>
            <BackRentReportingPurchasePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/billing"
        element={
          <ProtectedRoute requireSubscription={false}>
            <BillingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/documents"
        element={
          <ProtectedRoute requireSubscription={true}>
            <DocumentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/account"
        element={
          <ProtectedRoute requireSubscription={true}>
            <AccountPage />
          </ProtectedRoute>
        }
      />

      {/* Admin Routes */}
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route
        path="/admin/password-reset"
        element={<AdminPasswordResetPage />}
      />
      <Route
        path="/admin/password-reset-confirm"
        element={<AdminPasswordResetConfirmPage />}
      />
      <Route
        path="/admin/dashboard"
        element={
          <AdminProtectedRoute>
            <AdminRentReportsPage />
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/admin/rent-reports"
        element={
          <AdminProtectedRoute>
            <AdminRentReportsPage />
          </AdminProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
