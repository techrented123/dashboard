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
  Crown,
} from "lucide-react";
import { useEffect, useState } from "react";

function GradientStar(props: React.SVGProps<SVGSVGElement>) {
  const id = "sidebar-star-gradient";
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="50%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <path
        d="M12 17.27L18.18 21 16.54 13.97 22 9.24l-7.19-.62L12 2 9.19 8.62 2 9.24l5.46 4.73L5.82 21z"
        fill={`url(#${id})`}
        stroke={`url(#${id})`}
        strokeWidth="1.2"
      />
    </svg>
  );
}

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
        h-full md:h-full
        bg-white dark:bg-slate-800 border-r dark:border-slate-700
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        md:block md:relative shrink-0 transition-all duration-200 ${
          isCollapsed ? "md:w-16" : "md:w-64"
        }
        flex flex-col overflow-visible
      `}
      >
        {/* Mobile header space */}
        <div className="h-14 md:hidden border-b dark:border-slate-700 shrink-0"></div>

        {/* Navigation - takes available space */}
        <nav
          className={`flex-1 p-3 space-y-3 transition-all duration-200 overflow-y-auto min-h-0 ${
            isCollapsed ? "md:w-16" : "md:w-64"
          }`}
        >
          {links.map(({ href, label, Icon, isPremium }) => {
            const active = location.pathname === href;
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
                        <Crown className="w-4 h-4 text-amber-500 fill-amber-500" />
                      )}
                    </span>
                  )}
                </Link>
                {/* Arrow buttons moved outside nav; no per-item overlay */}
              </div>
            );
          })}
        </nav>

        {/* Global collapse/expand control anchored to sidebar edge */}
        <button
          onClick={() => setIsCollapsed((c) => !c)}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="hidden md:flex absolute right-0 top-4 translate-x-1/2 items-center justify-center w-7 h-7 rounded-full bg-slate-900/90 text-white border border-slate-600 shadow z-[1000]"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>

        {/* Leave a Review Button at Bottom - always at bottom */}
        <div className="p-2 border-t dark:border-slate-700 shrink-0 mt-auto absolute bottom-0 left-0 right-0">
          <button
            onClick={() =>
              window.open(
                "https://share.google/VgHmnoUpKuObrx4E9",
                "_blank",
                "noopener,noreferrer"
              )
            }
            title={isCollapsed ? "Leave a Review" : undefined}
            className={`w-full text-white hover:underline transition-all duration-200 flex items-center gap-2 px-3 py-2.5 rounded-xl ${
              isCollapsed ? "justify-center" : "justify-start"
            }`}
          >
            <GradientStar className="w-5 h-5 shrink-0" />
            {!isCollapsed && <span>Leave a Review</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
