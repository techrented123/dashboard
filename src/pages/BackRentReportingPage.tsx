import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";
import AppLayout from "../components/AppLayout";
import Card from "../components/Card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import { Button } from "../components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
} from "../components/ui/select";
import { fetchAuthSession } from "aws-amplify/auth";
import { Toast } from "../components/ui/toast";
import { Skeleton } from "../components/Skeleton";
import { useAuth } from "../lib/context/authContext";
//import { useRentReports } from "../lib/hooks/useRentReports";
import { Plus, X } from "lucide-react";

// Enhanced form validation schema for back rent reporting
const historyEntrySchema = z
  .object({
    address1: z.string().min(1, "Address line 1 is required"),
    address2: z.string().optional(),
    city: z.string().min(1, "City is required"),
    provinceState: z.string().min(1, "Province/State is required"),
    postalZipCode: z.string().min(1, "Postal/ZIP code is required"),
    countryCode: z.string().min(1, "Country code is required"),
    startDate: z.date({
      message: "Please select a start date for reporting period",
    }),
    endDate: z.date({ message: "Please select a valid payment date" }),
    rentAmount: z
      .number({ message: "Please enter a valid rent amount" })
      .min(100, "Rent amount must be at least $100"),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.endDate >= data.startDate;
      }
      return true;
    },
    {
      message: "End date cannot be earlier than start date",
      path: ["endDate"],
    }
  );

// Form validation schema for back rent reporting
const formSchema = z
  .object({
    sin: z
      .string()
      .min(9, "SIN must be 9 digits")
      .max(9, "SIN must be 9 digits"),
    // Rental history entries - at least one required
    additionalHistory: z
      .array(historyEntrySchema)
      .min(1, "At least one rental history entry is required"),
  })
  .refine(
    (data) => {
      // Check if total reporting period spans more than 12 months
      const allEntries = data.additionalHistory.map((entry) => ({
        startDate: entry.startDate,
        endDate: entry.endDate,
      }));

      if (allEntries.length === 0) return true;

      // Find the earliest start date and latest end date
      const earliestStart = new Date(
        Math.min(...allEntries.map((e) => e.startDate.getTime()))
      );
      const latestEnd = new Date(
        Math.max(...allEntries.map((e) => e.endDate.getTime()))
      );

      // Calculate total months
      const yearDiff = latestEnd.getFullYear() - earliestStart.getFullYear();
      const monthDiff = latestEnd.getMonth() - earliestStart.getMonth();
      const totalMonths = yearDiff * 12 + monthDiff;

      return totalMonths <= 12;
    },
    {
      message:
        "The entire reporting period from your first start date to your last end date cannot exceed 12 months",
      path: ["additionalHistory"],
    }
  );

type FormValues = z.infer<typeof formSchema>;

export default function BackRentReportingPage() {
  const { user, isLoading: loadingUser } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isSuccessfullySubmitted, setIsSuccessfullySubmitted] = useState(false);
  const [hasAlreadyReported, setHasAlreadyReported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [checkingPurchase, setCheckingPurchase] = useState(true);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
    isVisible: boolean;
  }>({
    message: "",
    type: "success",
    isVisible: false,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      sin: "",
      additionalHistory: [
        {
          address1: "",
          address2: "",
          city: "",
          provinceState: "",
          postalZipCode: "",
          countryCode: "",
          startDate: new Date(),
          endDate: new Date(),
          rentAmount: 0,
        },
      ],
    },
  });

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type, isVisible: true });
    setTimeout(() => setToast((prev) => ({ ...prev, isVisible: false })), 5000);
  };

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "additionalHistory",
  });

  // Check if user has purchased the back rent reporting product
  const checkUserPurchase = async () => {
    try {
      console.log("🔍 Checking if user has purchased back rent reporting");
      console.log("👤 Current user:", user?.sub);

      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();

      if (!token) {
        console.log("❌ No authentication token available");
        navigate("/login");
        return;
      }

      // Check purchases API for back rent reporting purchases
      const purchasesApiUrl =
        "https://i26qdmcyv5.execute-api.us-west-2.amazonaws.com/prod";

      const response = await fetch(`${purchasesApiUrl}/${user?.sub}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log("📊 API Response data:", data);

        const purchases = data.purchases || [];
        console.log("🛒 All purchases:", purchases);

        // Check for any back rent report purchases (both reported and unreported)
        const allBackRentPurchases = purchases.filter(
          (purchase: any) =>
            purchase.product === "back-rent-report" &&
            purchase.userId === user?.sub
        );

        console.log("📦 All back rent purchases:", allBackRentPurchases);

        // If user has never purchased, redirect to purchase page
        if (allBackRentPurchases.length === 0) {
          console.log(
            "❌ User has never purchased back rent reporting, redirecting to purchase page"
          );
          navigate("/back-rent-reporting/purchase");
          return;
        }

        // Check for unreported purchases
        const unreportedPurchases = allBackRentPurchases.filter(
          (purchase: any) => purchase.reported === false || !purchase.reported
        );

        if (unreportedPurchases.length === 0) {
          // User has purchased but already reported all of them
          console.log(
            "✅ User has purchased and already submitted back rent report"
          );
          setHasAlreadyReported(true);
          setCheckingPurchase(false);
          return;
        }

        console.log("🎉 User has unreported purchases, showing form");
      } else {
        console.log(
          "❌ Purchases API not available, redirecting to purchase page"
        );
        console.log("📡 Response status:", response.status);

        let errorMessage = "Internal Server Error";
        try {
          const errorText = await response.text();
          console.log("📡 Response text:", errorText);
          if (errorText) {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.message || errorMessage;
          }
        } catch (parseError) {
          console.log("Could not parse error response");
        }

        console.log(`🚨 API Error (${response.status}): ${errorMessage}`);
        navigate("/back-rent-reporting/purchase");
        return;
      }

      // User has purchased, continue to show form
      setCheckingPurchase(false);
    } catch (err: any) {
      console.error("💥 Error checking purchase:", err);
      // If check fails, redirect to purchase page to be safe
      navigate("/back-rent-reporting/purchase");
    }
  };

  // Update form values when user data becomes available

  // Check purchase when component mounts
  useEffect(() => {
    console.log("🚀 BackRentReportingPage mounted");
    console.log("👤 User from useAuth:", user);

    const initializePage = async () => {
      if (user && !loadingUser) {
        console.log("✅ User available, calling checkUserPurchase");
        await checkUserPurchase();
      } else if (!loadingUser) {
        console.log("❌ No user available, redirecting to login");
        navigate("/back-rent-reporting/purchase");
      }
    };

    initializePage();
  }, [user, loadingUser]);

  /*  const uploadRentReceipt = async (file: File): Promise<string> => {
    const session = await fetchAuthSession();
    const token = session.tokens?.idToken?.toString();

    if (!token) {
      throw new Error("Authentication token not available");
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "rent_receipt");

    // Get presigned URL from API
    const uploadBaseUrl =
      import.meta.env.VITE_UPLOAD_API_BASE_URL ||
      "https://rbzn5e69oa.execute-api.us-west-2.amazonaws.com";

    const response = await fetch(uploadBaseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type,
        userSub: user?.sub,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to upload rent receipt");
    }

    const data = await response.json();
    return data.key;
  };
 */
  const onSubmit = async (data: FormValues) => {
    console.log("Member back rent reporting form submitted:", data);

    try {
      setIsLoading(true);

      // Build history entries array
      const historyEntries = data.additionalHistory.map((entry) => ({
        firstName: user?.given_name,
        lastName: user?.family_name,
        email: user?.email,
        sin: data.sin,
        phoneNumber: user?.phone_number,
        dob: user?.birthdate,
        address1: entry.address1,
        address2: entry.address2 || "",
        city: entry.city,
        provinceState: entry.provinceState,
        postalZipCode: entry.postalZipCode,
        countryCode: entry.countryCode,
        rentAmount: entry.rentAmount,
        startDate: entry.startDate.toISOString(),
        endDate: entry.endDate.toISOString(),
      }));

      // Remove lines 345-366 (the duplicate forEach loop)

      try {
        await fetch(
          `https://mg9mbr6g5i.execute-api.us-west-2.amazonaws.com/mark-reported`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              verificationCode: "no-verification-code",
              userSub: user?.sub,
              historyEntries,
            }),
          }
        );
      } catch (err) {
        console.error("Failed to mark as reported:", err);
        throw err;
      }

      showToast("Back rent payment proof submitted successfully!", "success");

      // Set success state to show success message
      setIsSuccessfullySubmitted(true);
    } catch (error: any) {
      console.error("Error submitting back rent payment proof:", error);
      showToast(
        error.message ||
          "An error occurred while submitting your back rent payment proof",
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  /*  const handleReceiptClick = async (s3Key: string) => {
    try {
      const url = await getDocumentUrl(s3Key);
      setReceiptUrl(url);
      setIsReceiptDialogOpen(true);
    } catch (error) {
      console.error("Error fetching receipt:", error);
      showToast("Failed to load receipt", "error");
    }
  }; */

  // Handle purchase success
  const purchased = searchParams.get("purchased") === "true";
  if (purchased) {
    // Add product access to localStorage (in a real app, this would be handled by your backend)
    try {
      const stored = localStorage.getItem("purchasedProducts");
      const existing = stored ? JSON.parse(stored) : [];
      const newAccess = {
        productId: "back-rent-reporting",
        hasAccess: true,
        purchaseDate: new Date().toISOString(),
      };

      const updated = [
        ...existing.filter(
          (access: any) => access.productId !== "back-rent-reporting"
        ),
        newAccess,
      ];
      localStorage.setItem("purchasedProducts", JSON.stringify(updated));

      // Remove the purchased parameter from URL
      navigate("/back-rent-reporting", { replace: true });
    } catch (error) {
      console.error("Failed to add product access:", error);
    }
  }

  if (loadingUser || checkingPurchase) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="space-y-8">
            {/* Header skeleton */}
            <div>
              <Skeleton className="h-8 w-64 mb-2" />
              <Skeleton className="h-4 w-96 mb-4" />
              <Skeleton className="h-20 w-full" />
            </div>

            {/* Form skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
              <Card title="Submit Back Rent Payment Proof">
                <div className="space-y-6">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-10 w-full" />

                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-10 w-full" />

                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-10 w-full" />

                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />

                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-10 w-full" />

                  <Skeleton className="h-4 w-44" />
                  <Skeleton className="h-10 w-full" />

                  <Skeleton className="h-10 w-full" />
                </div>
              </Card>

              <Card title="Back Rent Reporting History">
                <div className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </Card>
            </div>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  if (hasAlreadyReported) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <Toast
            message={toast.message}
            type={toast.type}
            isVisible={toast.isVisible}
            onClose={() => setToast((prev) => ({ ...prev, isVisible: false }))}
          />

          <div className="space-y-8">
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-8 h-8 text-green-600 dark:text-green-400"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>

              <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                Already Submitted
              </h2>

              <p className="text-xl text-slate-600 dark:text-slate-400 mb-8">
                You have already submitted your back rent payment report
              </p>

              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-6 max-w-2xl mx-auto mb-8">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Next Steps
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                  Continue reporting your monthly rent payments to build your
                  credit history.
                </p>

                <Button
                  onClick={() => navigate("/dashboard")}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white sm:w-auto"
                  size="lg"
                >
                  Go to Dashboard
                </Button>
              </div>
            </div>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  if (isSuccessfullySubmitted) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <Toast
            message={toast.message}
            type={toast.type}
            isVisible={toast.isVisible}
            onClose={() => setToast((prev) => ({ ...prev, isVisible: false }))}
          />

          <div className="space-y-8">
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-8 h-8 text-green-600 dark:text-green-400"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>

              <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                Thank You!
              </h2>

              <p className="text-xl text-slate-600 dark:text-slate-400 mb-8">
                Your back rent payment has been reported to the credit bureau
              </p>

              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-6 max-w-2xl mx-auto mb-8">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Next Steps
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                  Continue reporting your monthly rent payments to build your
                  credit history.
                </p>

                <Button
                  onClick={() => navigate("/dashboard")}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white sm:w-auto"
                  size="lg"
                >
                  Go to Dashboard
                </Button>
              </div>
            </div>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AppLayout>
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={toast.isVisible}
          onClose={() => setToast((prev) => ({ ...prev, isVisible: false }))}
        />

        <div className="space-y-8">
          <div>
            <h1 className="text-2xl font-bold text-brand dark:text-primary-300 mb-2">
              Back Rent Reporting
            </h1>
            <p className="text-base text-slate-600 dark:text-slate-400 font-medium">
              Submit your historical rent payment proof to improve your credit
              score
            </p>

            {/* One-time use notice */}
            <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-amber-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    One-Time Use Notice
                  </h3>
                  <div className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                    <p>
                      This form is for one-time use only. Please submit all your
                      back rent payments at once. You can submit up to a
                      12-month period of back rent reporting. Once used, this
                      product might no longer be available to you.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 items-start">
            <Card title="Submit Back Rent Payment Proof">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  {/* SIN Field at the top */}
                  <FormField
                    control={form.control}
                    name="sin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SIN (Social Insurance Number)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="123456789"
                            {...field}
                            maxLength={9}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="dark:border-slate-700 pt-6 mt-6">
                    <h3 className="text-lg font-semibold mb-4">
                      Rental History #1
                    </h3>
                    <div className="border dark:border-slate-700 rounded-lg p-4 mb-4 bg-slate-50 dark:bg-slate-900/50">
                      <div className="space-y-4">
                        {/* Address fields */}
                        <FormField
                          control={form.control}
                          name="additionalHistory.0.address1"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Address Line 1</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="123 Main Street"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="additionalHistory.0.address2"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Address Line 2 (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="Apt 4B" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="additionalHistory.0.city"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>City</FormLabel>
                                <FormControl>
                                  <Input placeholder="Toronto" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="additionalHistory.0.provinceState"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Province/State</FormLabel>
                                <FormControl>
                                  <Input placeholder="ON" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="additionalHistory.0.postalZipCode"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Postal/ZIP Code</FormLabel>
                                <FormControl>
                                  <Input placeholder="M5V 3A8" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="additionalHistory.0.countryCode"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Country</FormLabel>
                                <FormControl>
                                  <Select
                                    value={field.value}
                                    onValueChange={field.onChange}
                                  >
                                    <SelectTrigger>
                                      {field.value || "Select country"}
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectGroup>
                                        <SelectLabel>Countries</SelectLabel>
                                        <SelectItem value="CA">
                                          Canada
                                        </SelectItem>
                                        <SelectItem value="US">
                                          United States
                                        </SelectItem>
                                        <SelectItem value="MX">
                                          Mexico
                                        </SelectItem>
                                      </SelectGroup>
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Date fields */}
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="additionalHistory.0.startDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Start Date</FormLabel>
                                <FormControl>
                                  <Input
                                    type="date"
                                    {...field}
                                    value={
                                      field.value
                                        ? field.value
                                            .toISOString()
                                            .split("T")[0]
                                        : ""
                                    }
                                    onChange={(e) => {
                                      field.onChange(new Date(e.target.value));
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="additionalHistory.0.endDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>End Date</FormLabel>
                                <FormControl>
                                  <Input
                                    type="date"
                                    {...field}
                                    value={
                                      field.value
                                        ? field.value
                                            .toISOString()
                                            .split("T")[0]
                                        : ""
                                    }
                                    onChange={(e) => {
                                      field.onChange(new Date(e.target.value));
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Rent amount */}
                        <FormField
                          control={form.control}
                          name="additionalHistory.0.rentAmount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Rent Amount ($)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="1200"
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Additional History Section */}
                  {fields.length > 1 && (
                    <div className="dark:border-slate-700 pt-6 mt-6">
                      <h3 className="text-lg font-semibold mb-4">
                        Additional Rental History
                      </h3>
                      {fields.slice(1).map((field, index) => (
                        <div
                          key={field.id}
                          className="border dark:border-slate-700 rounded-lg p-4 mb-4 bg-slate-50 dark:bg-slate-900/50"
                        >
                          <div className="flex justify-between items-center mb-4">
                            <h4 className="font-medium text-slate-900 dark:text-slate-100">
                              Rental History #{index + 2}
                            </h4>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => remove(index + 1)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="w-4 h-4 mr-1" />
                              Remove
                            </Button>
                          </div>

                          <div className="space-y-4">
                            {/* Address fields */}
                            <FormField
                              control={form.control}
                              name={`additionalHistory.${index + 1}.address1`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Address Line 1</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="123 Main Street"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`additionalHistory.${index + 1}.address2`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>
                                    Address Line 2 (Optional)
                                  </FormLabel>
                                  <FormControl>
                                    <Input placeholder="Apt 4B" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name={`additionalHistory.${index + 1}.city`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>City</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Toronto" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`additionalHistory.${
                                  index + 1
                                }.provinceState`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Province/State</FormLabel>
                                    <FormControl>
                                      <Input placeholder="ON" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name={`additionalHistory.${
                                  index + 1
                                }.postalZipCode`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Postal/ZIP Code</FormLabel>
                                    <FormControl>
                                      <Input placeholder="M5V 3A8" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`additionalHistory.${
                                  index + 1
                                }.countryCode`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Country</FormLabel>
                                    <FormControl>
                                      <Select
                                        value={field.value}
                                        onValueChange={field.onChange}
                                      >
                                        <SelectTrigger>
                                          {field.value || "Select country"}
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectGroup>
                                            <SelectLabel>Countries</SelectLabel>
                                            <SelectItem value="CA">
                                              Canada
                                            </SelectItem>
                                            <SelectItem value="US">
                                              United States
                                            </SelectItem>
                                            <SelectItem value="MX">
                                              Mexico
                                            </SelectItem>
                                          </SelectGroup>
                                        </SelectContent>
                                      </Select>
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            {/* Date fields */}
                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name={`additionalHistory.${
                                  index + 1
                                }.startDate`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Start Date</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="date"
                                        {...field}
                                        value={
                                          field.value
                                            ? field.value
                                                .toISOString()
                                                .split("T")[0]
                                            : ""
                                        }
                                        onChange={(e) => {
                                          field.onChange(
                                            new Date(e.target.value)
                                          );
                                        }}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`additionalHistory.${index + 1}.endDate`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>End Date</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="date"
                                        {...field}
                                        value={
                                          field.value
                                            ? field.value
                                                .toISOString()
                                                .split("T")[0]
                                            : ""
                                        }
                                        onChange={(e) => {
                                          field.onChange(
                                            new Date(e.target.value)
                                          );
                                        }}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            {/* Rent amount */}
                            <FormField
                              control={form.control}
                              name={`additionalHistory.${index + 1}.rentAmount`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Rent Amount ($)</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      placeholder="1200"
                                      {...field}
                                      onChange={(e) =>
                                        field.onChange(
                                          parseFloat(e.target.value) || 0
                                        )
                                      }
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add More History Button */}
                  <div className="flex justify-center mt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        append({
                          address1: "",
                          address2: "",
                          city: "",
                          provinceState: "",
                          postalZipCode: "",
                          countryCode: "",
                          startDate: new Date(),
                          endDate: new Date(),
                          rentAmount: 0,
                        })
                      }
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add More History
                    </Button>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full text-white bg-blue-600 hover:bg-blue-700"
                    size="lg"
                  >
                    {isLoading ? "Submitting..." : "Submit Back Rent Payments"}
                  </Button>
                </form>
              </Form>
            </Card>
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
