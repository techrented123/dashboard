import { useAuth } from 'react-oidc-context';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function CallbackPage() {
  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (auth.isAuthenticated) {
      navigate('/dashboard');
    } else if (auth.error) {
      navigate('/login');
    }
  }, [auth.isAuthenticated, auth.error, navigate]);

  return (
    <main className="min-h-screen grid place-items-center p-4 bg-gradient-to-b from-white to-primary-50 dark:from-slate-900 dark:to-slate-800">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-soft p-6 border dark:border-slate-700">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <h1 className="text-xl font-semibold text-primary-800 dark:text-primary-300 mb-2">
            Completing sign in...
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Please wait while we redirect you to your dashboard.
          </p>
        </div>
      </div>
    </main>
  );
}
