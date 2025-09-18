import { useNavigate } from "react-router-dom";
import { Moon, Sun, User, Settings, LogOut } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { signOutUser } from "../lib/auth";
import { useAuth } from "../lib/context/authContext";

export default function Topbar() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isDark, setIsDark] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check for saved theme preference or default to light
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;

    if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !isDark;
    setIsDark(newDarkMode);

    if (newDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const handleAccountClick = () => {
    setIsDropdownOpen(false);
    navigate("/account");
  };

  const handleSignOut = async () => {
    setIsDropdownOpen(false);
    await signOutUser();
    navigate("/login");
  };

  // Get user's full name
  const getUserDisplayName = () => {
    if (!user) return "Welcome";
    const firstName = user.given_name || "";
    const fullName = `${firstName}`.trim();
    return fullName ? `Welcome ${fullName}` : "Welcome";
  };

  return (
    <header className="sticky top-0 z-10 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b dark:border-slate-700">
      <div className="px-4 md:px-6 lg:px-8 h-14 flex items-center justify-between">
        <div className="font-semibold text-primary-800 dark:text-primary-300 ml-16 md:ml-0">
          {getUserDisplayName()}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Toggle dark mode"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            )}
          </button>

          {/* User Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
              aria-label="User menu"
            >
              <User className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border dark:border-slate-700 py-1 z-50">
                <button
                  onClick={handleAccountClick}
                  className="hover:rounded-t-lg w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Account
                </button>
                <button
                  onClick={handleSignOut}
                  className="text-red-500 w-full flex items-center gap-3 px-4 py-2 text-sm hover:rounded-b-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <LogOut className="w-4 h-4 text-red-500" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
