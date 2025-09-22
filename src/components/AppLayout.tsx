import Topbar from "./Topbar";
import Sidebar from "./Sidebar";
import SubscriptionBanner from "./SubscriptionBanner";
import { useLocation } from "react-router-dom";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const hideBanner = location.pathname.startsWith("/billing");

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {!hideBanner && <SubscriptionBanner />}
      <Topbar />
      {/* Banner floats below the Topbar at top-16; no layout padding needed */}
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-4 md:p-6">
          <div className="container-padded space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
