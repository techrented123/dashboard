import { useNavigate } from "react-router-dom";
import { useMemo } from "react";
import ProtectedRoute from "../components/ProtectedRoute";
import AppLayout from "../components/AppLayout";
import Card from "../components/Card";
import { useRentReports } from "../lib/hooks/useRentReports";
import { useCreditScore } from "../lib/hooks/useCreditScore";
import type { CreditScoreData } from "../lib/credit-score";
import { useDocuments } from "../lib/hooks/useDocuments";
import { useBillingData } from "../lib/hooks/useBillingData";
import {
  ExternalLinkIcon,
  FileText,
  Info,
  FileSignature,
  Home,
  Wifi,
  Calculator,
} from "lucide-react";
import {
  Skeleton,
  SkeletonText,
  SkeletonCircle,
  SkeletonButton,
} from "../components/Skeleton";
import { Button } from "../components/ui/button";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { rentReports = [], isLoading: isLoadingReports } = useRentReports();
  const {
    data: creditScoreData,
    isLoading: isLoadingCreditScore,
    error: creditScoreError,
  } = useCreditScore() as {
    data: CreditScoreData | undefined;
    isLoading: boolean;
    error: Error | null;
  };

  const { data: documents = [], isLoading: isLoadingDocuments } =
    useDocuments();
  const { data: billingData, isLoading: isLoadingBilling } = useBillingData();

  // Memoized calculation for Gold member points
  const goldMemberPoints = useMemo(() => {
    if (billingData?.subscription?.plan_name !== "Gold") {
      return 0;
    }

    // Only count first 48 rent reports for points calculation
    const eligibleReports = rentReports.slice(0, 48);

    return eligibleReports.reduce((totalPoints, report) => {
      const rentAmount = report.rentAmount || 0;
      const pointsForReport = Math.min(rentAmount * 0.015, 37.5);
      return totalPoints + pointsForReport;
    }, 0);
  }, [rentReports, billingData?.subscription?.plan_name]);

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="space-y-8">
          <div>
            <h1 className="text-2xl font-bold text-brand dark:text-primary-300 mb-2">
              Dashboard
            </h1>
            <p className="text-base text-slate-600 dark:text-slate-400 font-medium">
              Welcome back! Here's your overview
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                <Card title="Credit Score">
                  {isLoadingCreditScore ? (
                    <div className="space-y-4">
                      <SkeletonCircle size="h-16 w-16" className="mx-auto" />
                      <SkeletonText lines={2} className="text-center" />
                    </div>
                  ) : creditScoreError ? (
                    <div className="">
                      <p className="text-center text-2xl font-semibold text-slate-400 dark:text-slate-500">
                        --
                      </p>
                      <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-2">
                        Error loading credit score
                      </p>
                      <Button
                        className="flex items-center gap-2 mt-5 !bg-[#077BFB]"
                        onClick={() =>
                          window.open("https://rented123.com/gold/", "_blank")
                        }
                      >
                        Get More Rewards{" "}
                        <ExternalLinkIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : !creditScoreData ? (
                    <div className="">
                      <p className="text-center text-2xl font-semibold text-slate-400 dark:text-slate-500">
                        --
                      </p>
                      <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-2">
                        No data returned
                      </p>
                      <Button
                        className="flex items-center gap-2 mt-5 !bg-[#077BFB]"
                        onClick={() =>
                          window.open("https://rented123.com/gold/", "_blank")
                        }
                      >
                        Get More Rewards{" "}
                        <ExternalLinkIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : creditScoreData?.status === "no_score" ? (
                    <div className="">
                      <p className="text-center text-2xl font-semibold text-slate-400 dark:text-slate-500">
                        --
                      </p>

                      <Button
                        className="flex items-center gap-2 mt-5 !bg-[#077BFB] text-white"
                        onClick={() =>
                          window.open(
                            "https://rented123.com/product/credit-check/",
                            "_blank"
                          )
                        }
                      >
                        Check My Credit Score{" "}
                        <ExternalLinkIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (creditScoreData?.status as string) === "no_score" ? (
                    <div className="">
                      <p className="text-center text-2xl font-semibold text-slate-400 dark:text-slate-500">
                        --
                      </p>
                      <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-2">
                        Credit score not available yet
                      </p>
                      <p className="text-center text-xs text-slate-400 mt-1">
                        Subscribe to view your credit score
                      </p>
                      <Button
                        className="mt-4 !bg-[#077BFB]"
                        onClick={() =>
                          window.open("https://rented123.com/gold/", "_blank")
                        }
                      >
                        Get Credit Monitoring{" "}
                        <ExternalLinkIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <ScoreGauge
                        value={creditScoreData?.score || 0}
                        min={creditScoreData?.min || 300}
                        max={creditScoreData?.max || 850}
                      />
                      <p className="text-xs text-slate-500 mt-2">
                        as of{" "}
                        {creditScoreData?.lastUpdated
                          ? new Date(
                              creditScoreData.lastUpdated
                            ).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "Unknown date"}{" "}
                        • {creditScoreData?.bureau || "Educational only"}
                      </p>
                    </>
                  )}
                </Card>
                <Card title="Next Report Date">
                  <div className="text-2xl font-bold dark:text-white">
                    {(() => {
                      const today = new Date();
                      const currentDay = today.getDate();

                      // If we're past the 4th of this month, show next month's 4th
                      // Otherwise, show this month's 4th
                      const targetDate = new Date(
                        today.getFullYear(),
                        today.getMonth(),
                        4
                      );
                      if (currentDay > 4) {
                        targetDate.setMonth(targetDate.getMonth() + 1);
                      }

                      return targetDate.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      });
                    })()}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    We&apos;ll remind you 3 days before.
                  </p>
                  <Button
                    className="mt-5 !bg-[#077BFB] text-white"
                    onClick={() => navigate("/rent-reporting")}
                  >
                    Report Now
                  </Button>
                </Card>

                <Card
                  title={
                    <div className="flex items-center justify-between">
                      <span>Rent to Own</span>
                      <div className="group relative">
                        <Info className="w-4 h-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer" />
                        <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-slate-900 dark:bg-slate-700 text-white text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                          Earn points with each rent payment and purchase your
                          dream home quicker
                          <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900 dark:border-t-slate-700"></div>
                        </div>
                      </div>
                    </div>
                  }
                >
                  <div className="text-2xl font-extrabold dark:text-white">
                    {Math.round(goldMemberPoints)} pts
                  </div>
                  {/*   <div className="text-sm text-slate-600 dark:text-slate-400">
                300 pts to next perk
              </div> */}
                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full mt-3 overflow-hidden">
                    <div
                      className="h-full bg-[#077BFB]"
                      style={{
                        width: `${Math.min(
                          (goldMemberPoints / 1800) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                  <div className="mt-3">
                    {billingData?.subscription?.plan_name !== "Gold" && (
                      <Button
                        className="text-white mt-5 !bg-[#077BFB] flex items-center gap-2"
                        onClick={() => {
                          if (billingData?.manageSubscriptionUrl) {
                            window.open(
                              billingData.manageSubscriptionUrl,
                              "_blank",
                              "noopener,noreferrer"
                            );
                          } else {
                            window.open(
                              "https://rented123.com/pricing-2/",
                              "_blank"
                            );
                          }
                        }}
                      >
                        Upgrade to Gold <ExternalLinkIcon className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </Card>
              </div>

              <section className="mb-6">
                <h2 className="text-lg font-semibold text-[#32429B] dark:text-primary-300 mb-3">
                  Rent Reporting Timeline
                </h2>
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow p-4">
                  {isLoadingReports ? (
                    <div className="flex flex-wrap gap-3">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Skeleton
                          key={index}
                          className="h-8 w-20 rounded-full"
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-3">
                      {rentReports.length > 0 ? (
                        rentReports
                          .sort(
                            (a: any, b: any) =>
                              new Date(b.paymentDate).getTime() -
                              new Date(a.paymentDate).getTime()
                          ) // Sort by most recent first
                          .slice(0, 5) // Show only 5 most recent reports
                          .map((report: any, i: number) => {
                            const paymentDate = new Date(report.paymentDate);
                            const month = paymentDate.toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                year: "numeric",
                              }
                            );
                            return (
                              <div
                                key={i}
                                className="px-4 py-2 rounded-full border dark:border-slate-600 text-sm flex items-center gap-2"
                              >
                                <span className="font-medium text-slate-700 dark:text-slate-300">
                                  {month}
                                </span>
                                <StatusPill status={report.status} />
                              </div>
                            );
                          })
                      ) : (
                        <div className="text-[rgb(50,66,155)] dark:text-slate-400 text-sm py-4 px-2">
                          No rent reports found
                        </div>
                      )}
                    </div>
                  )}
                  {rentReports.length > 0 && (
                    <div className="mt-4">
                      <Button
                        variant="link"
                        className="hover:underline px-4 dark:text-white bg-white dark:bg-slate-800"
                        onClick={() => navigate("/rent-reporting")}
                      >
                        View full history →
                      </Button>
                    </div>
                  )}
                </div>
              </section>
              <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                <Card title="Documents">
                  {isLoadingDocuments ? (
                    <div className="space-y-3">
                      <SkeletonText lines={3} />
                      <div className="flex gap-2">
                        <SkeletonButton />
                        <SkeletonButton />
                      </div>
                    </div>
                  ) : documents.length > 0 ? (
                    <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-1 list-disc pl-5">
                      {documents
                        .sort(
                          (a: any, b: any) =>
                            new Date(b.updatedAt).getTime() -
                            new Date(a.updatedAt).getTime()
                        )
                        .slice(0, 3)
                        .map((doc: any) => (
                          <li key={doc.docId} className="break-words">
                            {doc.filename}
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <div className="flex flex-col justify-between min-h-[100px]">
                      <div className="flex-1 flex items-start justify-center">
                        <div className="text-center">
                          <div className="w-16 h-16 mx-auto mb-0 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                            <FileText className="w-8 h-8 text-slate-400" />
                          </div>
                          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                            No Documents Uploaded Yet
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="link"
                      onClick={() => navigate("/documents")}
                      className="hover:underline px-4 dark:text-white bg-white dark:bg-slate-800"
                    >
                      Open Documents →
                    </Button>
                  </div>
                </Card>
                <Card title="Billing">
                  {isLoadingBilling ? (
                    <div className="space-y-3">
                      <SkeletonText lines={3} />
                      <div className="flex gap-2">
                        <SkeletonButton />
                        <SkeletonButton />
                      </div>
                    </div>
                  ) : billingData ? (
                    <>
                      <div className="text-sm text-slate-700 dark:text-slate-300">
                        Plan:{" "}
                        <span className="font-semibold">
                          {billingData.subscription?.plan_name || "N/A"}
                        </span>
                      </div>
                      <div className="text-sm text-slate-700 dark:text-slate-300">
                        Renewal:{" "}
                        <span className="font-semibold">
                          {billingData.subscription?.current_period_end
                            ? new Date(
                                billingData.subscription.current_period_end
                              ).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "N/A"}
                        </span>
                      </div>
                      <div className="text-sm text-slate-700 dark:text-slate-300">
                        Payment:{" "}
                        <span className="font-semibold">
                          {billingData.payment_method
                            ? `•••• ${billingData.payment_method.last4}`
                            : "No payment method"}
                        </span>
                      </div>
                      <Button
                        variant="link"
                        onClick={() => navigate("/billing")}
                        className="hover:underline px-0 mt-2 dark:text-white bg-white dark:bg-slate-800"
                      >
                        Manage Billing →
                      </Button>
                    </>
                  ) : (
                    <div className="flex flex-col justify-between min-h-[100px]">
                      <div className="flex-1 flex items-start justify-center">
                        <div className="text-center">
                          <div className="w-16 h-16 mx-auto mb-0 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                            <svg
                              className="w-8 h-8 text-slate-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                              />
                            </svg>
                          </div>
                          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                            No billing information found
                          </p>
                        </div>
                      </div>
                      <div className="mt-2">
                        <Button
                          variant="link"
                          onClick={() => navigate("/billing")}
                        >
                          Open Billing →
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              </section>
            </div>

            <aside className="lg:col-span-1">
              <section className="mb-6 lg:sticky lg:top-16">
                {(() => {
                  const services = [
                    {
                      title: "Telus Discount",
                      description:
                        "Receive discounts on your wifi & data services with Telus",
                      href: "https://forms.monday.com/forms/c68bfe588586b4d4edeac574337c140f?r=use1",
                      icon: Wifi,
                    },
                    {
                      title: "Financial Needs Analysis",
                      description:
                        "Get a free financial needs analysis from our financial partners",
                      href: "https://primericafinancialservices.pipedrive.com/scheduler/WrzvrvH1/intro-review-call",
                      icon: Calculator,
                    },
                    /*  {
                      title: "Renter’s Insurance",
                      description:
                        "Protect your belongings with affordable coverage",
                      href: "https://rented123.com/renters-insurance/",
                      icon: ShieldCheck,
                    },
                    {
                      title: "Credit Monitoring",
                      description: "Track changes and protect your credit",
                      href: "https://rented123.com/product/credit-check/",
                      icon: CreditCard,
                    }, */
                    {
                      title: "Mortgage Approval",
                      description:
                        "See if you qualify for a mortgage with our mortgage specialists",
                      href: "https://angelacalla.ca/request-a-call-back/",
                      icon: FileSignature,
                    },
                    {
                      title: "Find New Housing",
                      description: "See more housing options",
                      href: "https://rented123.com/properties/",
                      icon: Home,
                    },
                  ];

                  return (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow p-4 lg:max-h-[calc(100vh-64px)] overflow-auto">
                      <h2 className="text-lg font-semibold text-[#32429B] dark:text-primary-300 mb-3">
                        Quick Actions
                      </h2>
                      <div className="flex flex-col gap-3">
                        {services.map(
                          ({ title, description, href, icon: Icon }, idx) => (
                            <a
                              key={idx}
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 hover:shadow-sm hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                                  <Icon className="w-5 h-5 text-[#077BFB]" />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                                    {title}
                                  </div>
                                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                    {description}
                                  </div>
                                </div>
                              </div>
                              <ExternalLinkIcon className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 shrink-0" />
                            </a>
                          )
                        )}
                      </div>
                    </div>
                  );
                })()}
              </section>
            </aside>
          </div>

          {/*  <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card title="AI Agent Recap">
              <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-2">
                <li>
                  <span className="font-medium">Check July report</span> —
                  Posted{" "}
                  <span className="text-xs text-slate-500">(Aug 20)</span>
                </li>
                <li>
                  <span className="font-medium">How to add landlord</span> —
                  Guide sent{" "}
                  <span className="text-xs text-slate-500">(Aug 18)</span>
                </li>
                <li>
                  <span className="font-medium">
                    What will raise my score 20 pts?
                  </span>{" "}
                  — Tips shared
                </li>
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="outline" size="sm">
                  Ask agent
                </Button>
                <Button variant="link" size="sm">
                  See all →
                </Button>
              </div>
            </Card>

            <Card title="Rental Applications">
              <ul className="text-sm text-slate-700 dark:text-slate-300">
                <li className="py-2 border-t first:border-t-0 dark:border-slate-600 flex items-start justify-between gap-3">
                  <div>
                    <a
                      href="/applications/1203-2211-cambie"
                      className="font-medium text-slate-800 dark:text-slate-200 hover:underline"
                    >
                      #1203, 2211 Cambie St, Vancouver, BC
                    </a>
                    <div className="text-xs text-slate-500">
                      Applied: Aug 12, 2025
                    </div>
                  </div>
                  <StatusPill status="In Review" />
                </li>
                <li className="py-2 border-t dark:border-slate-600 flex items-start justify-between gap-3">
                  <div>
                    <a
                      href="/applications/4567-kingsway"
                      className="font-medium text-slate-800 dark:text-slate-200 hover:underline"
                    >
                      4567 Kingsway, Burnaby, BC
                    </a>
                    <div className="text-xs text-slate-500">
                      Applied: Jul 28, 2025
                    </div>
                  </div>
                  <StatusPill status="Submitted" />
                </li>
                <li className="py-2 border-t dark:border-slate-600 flex items-start justify-between gap-3">
                  <div>
                    <a
                      href="/applications/89-pacific-blvd"
                      className="font-medium text-slate-800 dark:text-slate-200 hover:underline"
                    >
                      89 Pacific Blvd, Vancouver, BC
                    </a>
                    <div className="text-xs text-slate-500">
                      Applied: Jun 30, 2025
                    </div>
                  </div>
                  <StatusPill status="Approved" />
                </li>
              </ul>
              <div className="mt-4">
                <a
                  href="/applications"
                  className="text-[#077BFB] hover:underline text-sm"
                >
                  View all applications →
                </a>
              </div>
            </Card>
          </section> */}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}

// Button component is imported from ../components/ui/button

function ScoreGauge({
  value,
  min,
  max,
}: {
  value: number;
  min: number;
  max: number;
}) {
  const r = 48; // radius
  const length = Math.PI * r; // semicircle length
  const pct = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const dashOffset = (1 - pct) * length;

  return (
    <div className="flex items-center gap-4">
      <svg
        viewBox="0 0 120 70"
        width="160"
        height="100"
        aria-label={`Credit score ${value}`}
      >
        {/* Background arc */}
        <path
          d="M12 60 A 48 48 0 0 1 108 60"
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="10"
        />
        {/* Progress arc */}
        <path
          d="M12 60 A 48 48 0 0 1 108 60"
          fill="none"
          stroke="#077BFB"
          strokeWidth="10"
          strokeLinecap="round"
          style={{ strokeDasharray: length, strokeDashoffset: dashOffset }}
        />
        {/* Ticks (quartiles) */}
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
          const angle = Math.PI * (1 - t);
          const x1 = 60 + (r + 2) * Math.cos(angle);
          const y1 = 60 - (r + 2) * Math.sin(angle);
          const x2 = 60 + (r - 6) * Math.cos(angle);
          const y2 = 60 - (r - 6) * Math.sin(angle);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#cbd5e1"
              strokeWidth={1.5}
            />
          );
        })}
      </svg>
      <div>
        <div className="text-3xl font-extrabold leading-none text-slate-800 dark:text-white">
          {value}
        </div>
        <div className="text-xs text-slate-500">
          Range {min}–{max}
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  // Map backend status to display text and colors
  const getStatusInfo = (status: string) => {
    switch (status) {
      case "Reported":
        return {
          text: "Reported",
          bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
          textColor: "text-emerald-700 dark:text-emerald-400",
          borderColor: "border-emerald-200 dark:border-emerald-800",
        };
      case "Late":
        return {
          text: "Late",
          bgColor: "bg-amber-100 dark:bg-amber-900/30",
          textColor: "text-amber-700 dark:text-amber-400",
          borderColor: "border-amber-200 dark:border-amber-800",
        };
      case "Missed":
        return {
          text: "Missed",
          bgColor: "bg-red-100 dark:bg-red-900/30",
          textColor: "text-red-700 dark:text-red-400",
          borderColor: "border-red-200 dark:border-red-800",
        };
      // Application statuses (keeping for other parts of the app)
      case "Submitted":
        return {
          text: "Submitted",
          bgColor: "bg-blue-100 dark:bg-blue-900/30",
          textColor: "text-blue-700 dark:text-blue-400",
          borderColor: "border-blue-200 dark:border-blue-800",
        };
      case "In Review":
        return {
          text: "In Review",
          bgColor: "bg-amber-100 dark:bg-amber-900/30",
          textColor: "text-amber-700 dark:text-amber-400",
          borderColor: "border-amber-200 dark:border-amber-800",
        };
      case "Approved":
        return {
          text: "Approved",
          bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
          textColor: "text-emerald-700 dark:text-emerald-400",
          borderColor: "border-emerald-200 dark:border-emerald-800",
        };
      case "Rejected":
        return {
          text: "Rejected",
          bgColor: "bg-red-100 dark:bg-red-900/30",
          textColor: "text-red-700 dark:text-red-400",
          borderColor: "border-red-200 dark:border-red-800",
        };
      default:
        return {
          text: status,
          bgColor: "bg-slate-100 dark:bg-slate-700",
          textColor: "text-slate-700 dark:text-slate-300",
          borderColor: "border-slate-200 dark:border-slate-600",
        };
    }
  };

  const statusInfo = getStatusInfo(status);

  return (
    <span
      className={`text-xs border rounded-full px-2 py-0.5 font-medium ${statusInfo.bgColor} ${statusInfo.textColor} ${statusInfo.borderColor}`}
    >
      {statusInfo.text}
    </span>
  );
}
