// BACKUP: Original Cognito OIDC implementation
// This file contains the previous OIDC-based authentication setup

import { useAuth } from 'react-oidc-context';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Original OIDC configuration
export const cognitoAuthConfig = {
  authority: 'https://cognito-idp.us-west-2.amazonaws.com/us-west-2_Jxmxbh6H5',
  client_id: '27re41h9g6r2phbstnpsodt5gm',
  redirect_uri: window.location.origin + '/callback',
  post_logout_redirect_uri: window.location.origin + '/login',
  response_type: 'code',
  scope: 'email openid phone',
};

// Original LoginPage component using OIDC
export function OIDCLoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (auth.isAuthenticated) {
      navigate('/dashboard');
    }
  }, [auth.isAuthenticated, navigate]);

  const handleSignIn = async () => {
    await auth.signinRedirect();
  };

  if (auth.isLoading) {
    return (
      <main className="min-h-screen grid place-items-center p-4 bg-gradient-to-b from-white to-primary-50 dark:from-slate-900 dark:to-slate-800">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
          <span className="text-slate-600 dark:text-slate-400">Loading...</span>
        </div>
      </main>
    );
  }

  if (auth.error) {
    return (
      <main className="min-h-screen grid place-items-center p-4 bg-gradient-to-b from-white to-primary-50 dark:from-slate-900 dark:to-slate-800">
        <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-soft p-6 border dark:border-slate-700">
          <div className="text-center">
            <h1 className="text-xl font-semibold text-red-600 mb-2">
              Authentication Error
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              {auth.error.message}
            </p>
            <button
              onClick={handleSignIn}
              className="bg-secondary text-white px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
            >
              Try Again
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen grid place-items-center p-4 bg-gradient-to-b from-white to-primary-50 dark:from-slate-900 dark:to-slate-800">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-soft p-6 border dark:border-slate-700">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-primary-800 dark:text-primary-300 mb-2">
            Welcome to Rented123
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-8">
            Sign in to access your dashboard and start building credit through
            rent payments
          </p>

          <button
            onClick={handleSignIn}
            className="w-full bg-secondary text-white rounded-xl py-3 font-medium hover:opacity-90 transition-opacity mb-4"
          >
            Sign in with Cognito
          </button>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Don't have an account? You'll be able to register through the
            sign-in page.
          </p>
        </div>
      </div>
    </main>
  );
}

// Original CallbackPage component
export function OIDCCallbackPage() {
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

// Original OIDC-based auth utilities
export function getOIDCCurrentUser() {
  if (typeof window === 'undefined') return null;

  try {
    const oidcStorage = sessionStorage.getItem(
      `oidc.user:${window.location.origin}`
    );
    if (oidcStorage) {
      const oidcUser = JSON.parse(oidcStorage);
      return {
        email: oidcUser.profile?.email,
        name: oidcUser.profile?.name,
        sub: oidcUser.profile?.sub,
      };
    }
  } catch (error) {
    console.error('Error parsing OIDC user:', error);
  }

  return null;
}

export function oidcSignOut() {
  const keys = Object.keys(sessionStorage);
  keys.forEach((key) => {
    if (key.startsWith('oidc.')) {
      sessionStorage.removeItem(key);
    }
  });
}