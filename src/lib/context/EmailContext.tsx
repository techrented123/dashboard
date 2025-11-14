"use client";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

interface EmailContextType {
  email: string | null;
  setEmail: (email: string | null) => void;
}

const EmailContext = createContext<EmailContextType | undefined>(undefined);

const STORAGE_KEY = "rented123_verification_email";

export const EmailProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [email, setEmail] = useState<string | null>(null);

  // Load email from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedEmail = localStorage.getItem(STORAGE_KEY);
      if (storedEmail) {
        setEmail(storedEmail);
      }
    }
  }, []);

  // Save email to localStorage whenever it changes
  const handleSetEmail = (newEmail: string | null) => {
    setEmail(newEmail);
    if (typeof window !== "undefined") {
      if (newEmail) {
        localStorage.setItem(STORAGE_KEY, newEmail);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  };

  return (
    <EmailContext.Provider value={{ email, setEmail: handleSetEmail }}>
      {children}
    </EmailContext.Provider>
  );
};

export const useEmail = () => {
  const context = useContext(EmailContext);
  if (context === undefined) {
    throw new Error("useEmail must be used within an EmailProvider");
  }
  return context;
};
