import { Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";

export default function CheckEmailPage() {
  const navigate = useNavigate();

  const handlePricingPlans = () => {
    navigate("/pricing-plans");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto px-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-soft border dark:border-slate-700 p-8 text-center">
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <Mail className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            Check Your Email
          </h1>

          <p className="text-slate-600 dark:text-slate-400 mb-2">
            We've sent you a verification link to complete your back rent
            reporting.
          </p>

          <p className="text-sm text-slate-500 dark:text-slate-500 mb-6">
            Click the link in your email to access the form.
          </p>

          <Button
            onClick={handlePricingPlans}
            variant="outline"
            className="w-full bg-blue-600 text-white hover:bg-blue-700"
          >
            Rent Reporting is Better as a Member
          </Button>
        </div>
      </div>
    </div>
  );
}
