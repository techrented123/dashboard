import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ExternalLink, Loader2, AlertCircle, CreditCard } from "lucide-react";
import { Skeleton, SkeletonText, SkeletonButton } from "../components/Skeleton";
import ProtectedRoute from "../components/ProtectedRoute";
import AppLayout from "../components/AppLayout";
import VisaLogo from "../assets/cards/visa.svg";
import MasterCardLogo from "../assets/cards/mastercard.svg";
import AmexLogo from "../assets/cards/amex.svg";
import DiscoverLogo from "../assets/cards/discover.svg";
import DefaultCardLogo from "../assets/cards/defaultCard.svg";
import { useBillingData } from "../lib/hooks/useBillingData";
import {
  createCustomerPortalSession,
  formatDate,
  formatAmount,
} from "../lib/stripe-billing";

// A simple helper to get a visual icon for the card brand

// helper mapping
const cardBrandLogos = {
  visa: VisaLogo,
  mastercard: MasterCardLogo,
  amex: AmexLogo,
  discover: DiscoverLogo,
};

// keep your existing helpers
const getCardBrandLabel = (brand: string) => {
  if (!brand) return "Card";
  const b = brand.toLowerCase();
  if (b.includes("visa")) return "Visa";
  if (b.includes("master")) return "Mastercard";
  if (b.includes("amex")) return "Amex";
  return brand.charAt(0).toUpperCase() + brand.slice(1);
};

// (keep your other helpers: formatDate, formatAmount, etc.)
// ... assume formatDate and formatAmount are already defined above this file or add them back in

export default function BillingPage() {
  const { data: billingData, isLoading, error } = useBillingData();
  const [portalLoading, setPortalLoading] = useState(false);
  const navigate = useNavigate();
  console.log({ billingData });

  const onManagePortal = async () => {
    if (!billingData?.manageSubscriptionUrl) {
      console.error("Billing portal is not available");
      return;
    }
    setPortalLoading(true);
    try {
      if (billingData.manageSubscriptionUrl) {
        // open in new tab for best UX
        window.open(
          billingData.manageSubscriptionUrl,
          "_blank",
          "noopener,noreferrer"
        );
      } else {
        const resp = await createCustomerPortalSession();
        window.open(resp.url, "_blank", "noopener,noreferrer");
      }
    } catch (err: any) {
      console.error("Portal error:", err);
    } finally {
      setPortalLoading(false);
    }
  };

  // --- Render helpers ---
  const renderHeader = () => (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
      <div>
        <h1 className="text-2xl font-bold text-brand dark:text-primary-300 mb-2">
          Billing
        </h1>
        <p className="text-base text-slate-600 dark:text-slate-400 font-medium">
          Manage your subscription and view payment history
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={onManagePortal}
          disabled={portalLoading || !billingData?.manageSubscriptionUrl}
          className={`btn-primary inline-flex items-center gap-3 px-6 py-3 rounded-xl font-semibold text-base transition-all duration-200 ${
            !billingData?.manageSubscriptionUrl
              ? "opacity-50 cursor-not-allowed bg-slate-300 hover:bg-slate-300"
              : ""
          }`}
          aria-disabled={!billingData?.manageSubscriptionUrl}
        >
          {portalLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <ExternalLink className="w-5 h-5" />
          )}
          <span>Manage Subscription</span>
        </button>
      </div>
    </div>
  );

  const renderLoading = () => (
    <div className="space-y-4">
      <SkeletonText lines={3} />
      <div className="flex gap-2">
        <SkeletonButton />
        <SkeletonButton />
      </div>
    </div>
  );

  const renderError = () => {
    // Don't show error banner for API failures when user has no subscription
    // The "No Active Subscription" card already handles this case
    if (!billingData || !billingData.subscription) {
      return null;
    }

    return (
      <div className="p-4 rounded-lg bg-rose-50 text-rose-800 border border-rose-100 flex items-start gap-3">
        <AlertCircle className="w-5 h-5" />
        <div className="text-sm">
          {error?.message || "Unable to load billing information"}
        </div>
      </div>
    );
  };

  const renderNoSubscription = () => (
    <div className="p-6 bg-white dark:bg-slate-800 rounded-lg">
      <div className="text-center space-y-4">
        <div className="p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl">
          <h3 className="font-medium text-blue-800 dark:text-blue-300 mb-2">
            No Active Subscription
          </h3>
          <p className="text-sm text-blue-700 dark:text-blue-400 mb-4">
            You need an active subscription to access all features.
          </p>
          <button
            onClick={() => navigate("/subscribe")}
            className="inline-flex items-center gap-2 bg-secondary text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            <CreditCard className="w-4 h-4" />
            Start Subscription
          </button>
        </div>
      </div>
    </div>
  );

  // ----- UPDATED: renderPaymentMethod shows logo image -----
  const renderPaymentMethod = (pm: any) => {
    if (!pm) {
      return (
        <div className="text-sm text-slate-600">No payment method on file.</div>
      );
    }

    // Some payloads put card info directly at top-level, others under `.card`
    const brand = pm.brand || pm.card?.brand;
    const last4 = pm.last4 || pm.card?.last4;
    const exp_month = pm.exp_month || pm.card?.exp_month;
    const exp_year = pm.exp_year || pm.card?.exp_year;

    // pick logo; fallback to default
    const logoSrc =
      cardBrandLogos[
        (brand || "").toLowerCase() as keyof typeof cardBrandLogos
      ] || DefaultCardLogo;
    const brandLabel = getCardBrandLabel(brand);

    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-8 rounded-md bg-white/0 dark:bg-transparent flex items-center justify-center">
            <img
              src={logoSrc}
              alt={brand ? `${brandLabel} logo` : "card logo"}
              className="w-10 h-6 object-contain"
              loading="lazy"
              onError={(e: any) => {
                // fallback to default if logo fails to load
                if (e?.currentTarget) e.currentTarget.src = DefaultCardLogo;
              }}
            />
          </div>
        </div>

        <div>
          <div className="text-sm font-medium text-slate-800 dark:text-slate-100">
            Ending in {last4}
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Expires {String(exp_month).padStart(2, "0")}/{exp_year}
          </div>
          <div className="text-xs text-slate-400 mt-1">{brandLabel}</div>
        </div>
      </div>
    );
  };

  // (keep your renderInvoices implementation unchanged) ...
  const renderInvoices = (invoices: any[] = []) => {
    if (!invoices || invoices.length === 0) {
      return (
        <div className="text-sm text-slate-600">No billing history found.</div>
      );
    }

    return (
      <div className="space-y-3">
        {/* Desktop table */}
        <div className="hidden md:block">
          <div className="overflow-x-auto rounded-lg border border-slate-100 dark:border-slate-700">
            <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-700 text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/40">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">
                    Description
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-500">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-slate-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-500">
                    Invoice
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-900">
                {invoices.map((inv: any) => (
                  <tr
                    key={inv.id}
                    className="border-b border-slate-100 dark:border-slate-800"
                  >
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                      {formatDate(inv.date)}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                      {inv.description || "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800 dark:text-slate-100">
                      {formatAmount(inv.amount_total, inv.amount_display)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                          inv.status === "paid"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                            : inv.status === "open" || inv.status === "unpaid"
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                            : "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {inv.hosted_invoice_url ? (
                        <a
                          href={inv.hosted_invoice_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 dark:text-indigo-300 hover:underline"
                        >
                          View
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile stacked cards */}
        <div className="md:hidden space-y-2">
          {invoices.map((inv: any) => (
            <div
              key={inv.id}
              className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-sm text-slate-600 dark:text-slate-300">
                    {formatDate(inv.date)}
                  </div>
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    {inv.description || "—"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">
                    {formatAmount(inv.amount_total, inv.amount_display)}
                  </div>
                  <div className="mt-1">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                        inv.status === "paid"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                          : inv.status === "open" || inv.status === "unpaid"
                          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                          : "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {inv.status}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-3 text-right">
                {inv.hosted_invoice_url ? (
                  <a
                    href={inv.hosted_invoice_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 dark:text-indigo-300 text-sm hover:underline"
                  >
                    View invoice
                  </a>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // --- Main render ---
  return (
    <ProtectedRoute requireSubscription={false}>
      <AppLayout>
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-7 space-y-6 ">
          {renderHeader()}

          {error && renderError()}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column: plan & payment */}
            <div className="lg:col-span-1 space-y-4">
              <div className="py-4 px-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                {isLoading ? (
                  <div className="space-y-4">
                    <SkeletonText lines={3} />
                    <div className="flex gap-2">
                      <SkeletonButton />
                      <SkeletonButton />
                    </div>
                  </div>
                ) : !billingData || !billingData.subscription ? (
                  renderNoSubscription()
                ) : (
                  <>
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <div className="text-sm text-slate-500">Plan</div>
                        <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                          {billingData.subscription.plan_name}
                        </div>
                        {/* If you want to show price, include it here (not present in payload) */}
                      </div>
                      <div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                            billingData.subscription.status === "trialing"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                              : billingData.subscription.status === "active"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                              : "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {billingData.subscription.status}
                        </span>
                      </div>
                    </div>

                    {/* Trial / renew / cancel info */}
                    <div className="mt-3 space-y-2">
                      {billingData.subscription.status === "trialing" && (
                        <div className="text-sm bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-3 rounded">
                          <div className="font-medium text-blue-800 dark:text-blue-300">
                            Trial ends{" "}
                            {formatDate(
                              billingData.subscription.current_period_end
                            )}
                          </div>
                        </div>
                      )}
                      {billingData.subscription.status === "active" &&
                        !billingData.subscription.cancel_at_period_end && (
                          <div className="text-sm bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 p-3 rounded">
                            Renews on{" "}
                            {formatDate(
                              billingData.subscription.current_period_end
                            )}
                          </div>
                        )}
                      {billingData.subscription.cancel_at_period_end && (
                        <div className="text-sm bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-800 p-3 rounded">
                          Cancels on{" "}
                          {formatDate(billingData.subscription.cancel_at)}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                <div className="text-sm text-slate-500">Payment method</div>
                <div className="mt-3">
                  {isLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  ) : (
                    renderPaymentMethod(
                      billingData?.subscription?.default_payment_method ||
                        billingData?.savedPaymentMethods?.[0]
                    )
                  )}
                </div>
              </div>
            </div>

            {/* Right column: invoices */}
            <div className="lg:col-span-2">
              <div className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Billing history
                  </h2>
                  <div className="text-sm text-slate-500">
                    {billingData?.invoices?.length ?? 0} invoice(s)
                  </div>
                </div>

                <div className="mt-4">
                  {isLoading
                    ? renderLoading()
                    : renderInvoices(billingData?.invoices || [])}
                </div>
              </div>
            </div>
          </div>

          {/* Small footer / support */}
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Need help? Contact{" "}
            <a
              className="text-indigo-600 dark:text-indigo-300 hover:underline"
              href="mailto:admin@rented123.com;tech@rented123.com;rob@rented123.com"
            >
              admin@rented123.com
            </a>
            .
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
