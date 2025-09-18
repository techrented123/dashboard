import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import LoginForm from '../components/LoginForm';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [successMessage, setSuccessMessage] = useState('');

  // Get success message from navigation state (from registration)
  useState(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
    }
  });

  const handleLoginSuccess = () => {
    navigate('/dashboard');
  };

  return (
    <main className="min-h-screen grid place-items-center p-4 bg-gradient-to-b from-white to-primary-50 dark:from-slate-900 dark:to-slate-800">
      <LoginForm 
        onSuccess={handleLoginSuccess}
        successMessage={successMessage}
      />
    </main>
  );
}