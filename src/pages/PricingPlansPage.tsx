import { CheckCircle2 } from "lucide-react";
import { Button } from "../components/ui/button";
import logo from "../assets/logo.png";

export default function PricingPlansPage() {
  const handleGetStarted = (plan: string) => {
    window.location.href = `/register?plan=${plan}`;
  };

  const plans = [
    {
      name: "Bronze",
      price: "$4.99",
      period: "Per Month",
      features: [
        "24/7/365 Personalized Rental Support & Advice",
        "Quarterly Real Estate, Mortgage & Financial Planning Updates",
        "Landlord Certification & Reference Letter",
        "Discounts On Rent Guarantee Programs",
      ],
      highlight: false,
    },
    {
      name: "Silver",
      price: "$9.99",
      period: "Per Month",
      features: [
        "All The Benefits Of Bronze Membership",
        "Monthly Rent Reporting To Credit Companies",
        "Back Rent Reporting At A Discount to Credit Companies",
        "Marketplace Access - Discounts On Rental Products And Services",
        "1-On-1 Financial Planning Session",
      ],
      highlight: true,
    },
    {
      name: "Gold",
      price: "$29.99",
      period: "Per Month",
      features: [
        "All The Benefits Of Silver Membership",
        "Priority Access To Exclusive Financial Tools, And Property Opportunities",
        "Complimentary Access To Our Financial IQ Webinars",
        "Back Rent Reporting At A Discount to Credit Companies",
        "Premium Support & Fast-Track Tenant Profile Certification For Housing Applications",
        "VIP Perks At Rented123.Com Events & Seminars",
        "Earn 1.5% Rent Credits For Future Purchases*",
      ],
      highlight: false,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header with Logo */}
      <header className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="container mx-auto px-4 py-4 flex justify-center items-center">
          <img src={logo} alt="Rented123" className="h-20" />
        </div>
      </header>

      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 mb-2">
            Find the perfect membership plan for your rental journey
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            All plans are eligible for 2 months free
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl shadow-lg overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl ${
                plan.highlight
                  ? "bg-blue-600 text-white border-4 border-blue-500 hover:border-blue-300"
                  : "bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-blue-400"
              }`}
            >
              {plan.highlight && (
                <div className="absolute top-0 right-0 bg-green-500 text-white px-8 py-2 transform rotate-12 translate-x-4 -translate-y-2 text-sm font-bold z-10">
                  BEST DEAL
                </div>
              )}

              <div className="p-8 h-full flex flex-col">
                {/* Header */}
                <div className="mb-6">
                  <h2
                    className={`text-3xl font-bold mb-2 ${
                      plan.highlight
                        ? "text-white"
                        : "text-slate-900 dark:text-slate-100"
                    }`}
                  >
                    {plan.name}
                  </h2>
                  <div className="flex items-baseline gap-2">
                    <span
                      className={`text-5xl font-bold ${
                        plan.highlight ? "text-white" : "text-blue-600"
                      }`}
                    >
                      {plan.price}
                    </span>
                    <span
                      className={`text-lg ${
                        plan.highlight
                          ? "text-blue-100"
                          : "text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {plan.period}
                    </span>
                  </div>
                </div>

                {/* Features */}
                <div className="flex-1 space-y-4 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-start gap-3">
                      <CheckCircle2
                        className={`w-5 h-5 flex-shrink-0 mt-1 ${
                          plan.highlight ? "text-white" : "text-green-500"
                        }`}
                      />
                      <p
                        className={`text-sm ${
                          plan.highlight
                            ? "text-blue-50"
                            : "text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        {feature}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Button */}
                <Button
                  onClick={() => handleGetStarted(plan.name.toLowerCase())}
                  className={`w-full py-6 text-lg font-semibold rounded-lg ${
                    plan.highlight
                      ? "bg-blue-500 hover:bg-blue-400 text-white"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                >
                  GET STARTED
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <div className="mt-12 text-center">
          <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-6 max-w-4xl mx-auto">
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
              * Rent credits under the Rented123.com Dream Home Program are
              non-cash promotional incentives.
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              * Credits are recorded to reward consistent rent payments and
              responsible tenancy, and are only redeemable as a closing
              incentive upon the successful purchase of a qualifying property
              through an approved Rented123.com Realtor
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
