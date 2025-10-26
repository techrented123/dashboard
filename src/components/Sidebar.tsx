import { Link, useLocation } from "react-router-dom";
import {
  Menu,
  X,
  Home,
  ClipboardCheck,
  DollarSign,
  FileText,
  User,
  ChevronLeft,
  ChevronRight,
  Star,
} from "lucide-react";
import { useEffect, useState } from "react";

const links = [
  { href: "/dashboard", label: "Dashboard", Icon: Home },
  { href: "/rent-reporting", label: "Rent Reporting", Icon: ClipboardCheck },
  {
    href: "/back-rent-reporting",
    label: "Back Rent Reporting",
    Icon: ClipboardCheck,
    isPremium: true,
  },
  { href: "/billing", label: "Billing", Icon: DollarSign },
  { href: "/documents", label: "Documents", Icon: FileText },
  { href: "/account", label: "Account", Icon: User },
];

export default function Sidebar() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("sidebarCollapsed") === "1";
  });

  useEffect(() => {
    try {
      localStorage.setItem("sidebarCollapsed", isCollapsed ? "1" : "0");
    } catch {}
  }, [isCollapsed]);

  const toggleSidebar = () => setIsOpen(!isOpen);
  const closeSidebar = () => setIsOpen(false);

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={toggleSidebar}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white dark:bg-slate-800 shadow-soft border dark:border-slate-600"
        aria-label="Toggle menu"
      >
        {isOpen ? (
          <X className="w-5 h-5 text-slate-700 dark:text-slate-300" />
        ) : (
          <Menu className="w-5 h-5 text-slate-700 dark:text-slate-300" />
        )}
      </button>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
        fixed md:static top-0 left-0 z-40
        h-full md:h-[calc(100vh-56px)] 
        bg-white dark:bg-slate-800 border-r dark:border-slate-700
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        md:block shrink-0 md:sticky md:top-14 transition-all duration-200 ${
          isCollapsed ? "md:w-16" : "md:w-64"
        }
      `}
      >
        {/* Mobile header space */}
        <div className="h-14 md:hidden border-b dark:border-slate-700"></div>

        {/* Desktop collapse toggle moved inline with first nav item */}

        <nav
          className={`p-3 space-y-3 transition-all duration-200 ${
            isCollapsed ? "md:w-16" : "md:w-64"
          }`}
        >
          {links.map(({ href, label, Icon, isPremium }, index) => {
            const active = location.pathname === href;
            const isFirst = index === 0;
            return (
              <div key={href} className="relative">
                <Link
                  to={href}
                  onClick={closeSidebar}
                  title={isCollapsed ? label : undefined}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition ${
                    active
                      ? "bg-primary-50 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 font-medium"
                      : "hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                  } ${isCollapsed ? "justify-center" : "justify-start"}`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {!isCollapsed && (
                    <span className="truncate flex items-center gap-2">
                      {label}
                      {isPremium && (
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      )}
                    </span>
                  )}
                </Link>
                {isFirst && !isCollapsed && (
                  <button
                    onClick={() => setIsCollapsed(true)}
                    aria-label="Collapse sidebar"
                    className="hidden md:flex absolute -right-6 top-[10%] -translate-y-1/2 items-center justify-center w-6 h-6 rounded-full bg-white border dark:bg-slate-800 dark:border-slate-600 shadow"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                )}
                {isFirst && isCollapsed && (
                  <button
                    onClick={() => setIsCollapsed(false)}
                    aria-label="Expand sidebar"
                    className="hidden md:flex absolute -right-5 top-[10%] -translate-y-1/2 items-center justify-center w-6 h-6 rounded-full bg-white border dark:bg-slate-800 dark:border-slate-600 shadow"
                  >
                    <ChevronRight className="w-3.5 h-3.5 " />
                  </button>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
