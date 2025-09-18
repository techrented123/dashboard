import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/rent-reporting", label: "Rent Reporting" },
  { href: "/billing", label: "Billing" },
  { href: "/documents", label: "Documents" },
  { href: "/account", label: "Account" },
];

export default function Sidebar() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

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
        w-64 h-full md:h-[calc(100vh-56px)] 
        bg-white dark:bg-slate-800 border-r dark:border-slate-700
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        md:block shrink-0 md:sticky md:top-14
      `}
      >
        {/* Mobile header space */}
        <div className="h-14 md:hidden border-b dark:border-slate-700"></div>

        <nav className="p-3 space-y-1">
          {links.map(({ href, label }) => {
            const active = location.pathname === href;
            return (
              <Link
                key={href}
                to={href}
                onClick={closeSidebar}
                className={`block px-3 py-2 rounded-xl text-sm transition ${
                  active
                    ? "bg-primary-50 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 font-medium"
                    : "hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
