import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterUserInfoPage from "./pages/RegisterUserInfoPage";
import RegisterBillingPage from "./pages/RegisterBillingPage";
import RegisterConfirmPage from "./pages/RegisterConfirmPage";
import SubscribePage from "./pages/SubscribePage";
import DashboardPage from "./pages/DashboardPage";
import RentReportingPage from "./pages/RentReportingPage";
import BillingPage from "./pages/BillingPage";
import DocumentsPage from "./pages/DocumentsPage";
import AccountPage from "./pages/AccountPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ConfirmPasswordResetPage from "./pages/ConfirmPasswordResetPage";
import ProtectedRoute from "./components/ProtectedRoute";
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
          <ProtectedRoute>
            <DocumentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/account"
        element={
          <ProtectedRoute requireSubscription={false}>
            <AccountPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
