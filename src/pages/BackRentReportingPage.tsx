import { useForm } from "react-hook-form";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Button } from "../components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
} from "../components/ui/select";
import { cn } from "../lib/utils";
import { fetchAuthSession } from "aws-amplify/auth";
import { Toast } from "../components/ui/toast";
import { useAuth } from "../lib/context/authContext";
//import { useRentReports } from "../lib/hooks/useRentReports";
import { submitTenantData } from "@/lib/submit-tenant-data";

const today = new Date();
// Calculate minimum start date (1st day of the month, 12 months ago from today)
const getMinStartDate = (): string => {
  const minDate = new Date(today.getFullYear() - 1, today.getMonth() - 1, 1);
  return minDate.toISOString().split("T")[0];
};

// Form validation schema for back rent reporting
const formSchema = z
  .object({
    sin: z
      .string()
      .min(9, "SIN must be 9 digits")
      .max(9, "SIN must be 9 digits"),
    confirmationNumber: z.string().min(1, "Confirmation number is required"),
    phoneNumber: z.string().min(10, "Phone number must be at least 10 digits"),
    rentAmount: z
      .number({ message: "Please enter a valid rent amount" })
      .min(100, "Rent amount must be at least $100"),
    addressChanged: z.boolean(),
    newAddress: z
      .object({
        address1: z.string().min(1, "Address line 1 is required"),
        address2: z.string().optional(),
        city: z.string().min(1, "City is required"),
        provinceState: z.string().min(1, "Province/State is required"),
        postalZipCode: z.string().min(1, "Postal/ZIP code is required"),
        countryCode: z.string().min(1, "Country code is required"),
      })
      .nullable(),
    paymentDate: z.date({ message: "Please select a valid payment date" }),
    rentReceipt: z.instanceof(File).optional(),
    // Additional fields for back rent reporting
    startDate: z.date({
      message: "Please select a start date for reporting period",
    }),
  })
  .refine(
    (data) => {
      // If address changed is true, newAddress must not be null
      if (data.addressChanged && !data.newAddress) {
        return false;
      }
      return true;
    },
    {
      message: "New address is required when address has changed",
      path: ["newAddress"],
    }
  )
  .refine(
    (data) => {
      // Ensure end date is no more than 12 months from start date
      if (data.startDate && data.paymentDate) {
        // Calculate the difference in months more accurately
        const startYear = data.startDate.getFullYear();
        const startMonth = data.startDate.getMonth();
        const endYear = data.paymentDate.getFullYear();
        const endMonth = data.paymentDate.getMonth();

        // Calculate total months difference
        const totalMonths =
          (endYear - startYear) * 12 + (endMonth - startMonth);

        // Allow up to 13 months (1 year + 1 month)
        // This means Sept 1, 2024 to Sept 30, 2025 is valid (12 months)
        // and Sept 1, 2024 to Oct 31, 2025 is also valid (13 months)
        return totalMonths <= 13;
      }
      return true;
    },
    {
      message: "End date cannot be more than 12 months from start date",
      path: ["paymentDate"],
    }
  )
  .refine(
    (data) => {
      // Ensure end date is at least 1 month after start date
      if (data.startDate && data.paymentDate) {
        const yearDiff =
          data.paymentDate.getFullYear() - data.startDate.getFullYear();
        const monthDiff =
          data.paymentDate.getMonth() - data.startDate.getMonth();
        const totalMonths = yearDiff * 12 + monthDiff;
        return totalMonths >= 1;
      }
      return true;
    },
    {
      message: "End date must be at least 1 month after start date",
      path: ["paymentDate"],
    }
  )
  .refine(
    (data) => {
      // Ensure start date is not more than 2 months from current month
      if (data.startDate) {
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();
        const startYear = data.startDate.getFullYear();
        const startMonth = data.startDate.getMonth();

        // Calculate months difference
        const yearDiff = startYear - currentYear;
        const monthDiff = startMonth - currentMonth;
        const totalMonthsDiff = yearDiff * 12 + monthDiff;

        // Allow up to 2 months from current month (including current month)
        return totalMonthsDiff <= 2;
      }
      return true;
    },
    {
      message: "Start date cannot be more than 2 months from the current month",
      path: ["startDate"],
    }
  );

type FormValues = z.infer<typeof formSchema>;

export default function BackRentReportingPage() {
  const { user, isLoading: loadingUser } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  //const { rentReports, isLoading: isRefreshingReports } = useRentReports();

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
      confirmationNumber: "",
      phoneNumber: user?.phone_number || "",
      rentAmount: 0,
      addressChanged: false,
      newAddress: null,
      paymentDate: new Date(),
      rentReceipt: undefined,
      startDate: new Date(),
    },
  });

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type, isVisible: true });
    setTimeout(() => setToast((prev) => ({ ...prev, isVisible: false })), 5000);
  };

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

      console.log("📡 API Response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("📊 API Response data:", data);

        const purchases = data.purchases || [];
        console.log("🛒 All purchases:", purchases);

        // Check if user has purchased back rent reporting
        const hasPurchased = purchases.some((purchase: any) => {
          const isBackRentProduct = purchase.product === "back-rent-report";
          const isCurrentUser = purchase.userId === user?.sub;
          const isOneTimeUse = purchase.reported;
          console.log(`🔍 Checking purchase:`, {
            purchase,
            matches: isBackRentProduct && isCurrentUser,
          });

          return isBackRentProduct && isCurrentUser && !isOneTimeUse;
        });

        console.log("✅ Has purchased back rent reporting:", hasPurchased);

        if (!hasPurchased) {
          // User hasn't purchased, redirect to purchase page
          console.log(
            "💳 User has not purchased back rent reporting, redirecting to purchase page"
          );
          navigate("/back-rent-reporting/purchase");
          return;
        } else {
          console.log(
            "🎉 User has purchased back rent reporting, showing form"
          );
          const unreportedPurchases = purchases.filter(
            (purchase: any) =>
              purchase.product === "back-rent-report" &&
              purchase.userId === user?.sub &&
              (purchase.reported === false || !purchase.reported)
          );

          if (unreportedPurchases.length === 0) {
            // No unreported purchases, redirect to purchase page
            navigate("/back-rent-reporting/purchase");
            return;
          }
        }
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
  useEffect(() => {
    if (user && !loadingUser) {
      form.setValue("phoneNumber", user.phone_number || "");
    }
  }, [user, loadingUser, form]);

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
        navigate("/login");
      }
    };

    initializePage();
  }, [user, loadingUser]);

  const uploadRentReceipt = async (file: File): Promise<string> => {
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

  const onSubmit = async (data: FormValues) => {
    console.log("Back rent reporting form submitted:", data);
    const session = await fetchAuthSession();

    if (!user) {
      showToast("User information not available", "error");
      return;
    }

    try {
      setIsLoading(true);

      // Handle rent receipt upload if present
      let s3Key = null;
      if (data.rentReceipt) {
        s3Key = await uploadRentReceipt(data.rentReceipt);
      }
      // Prepare form data for submission - similar to regular rent reporting
      // but with additional back rent specific fields
      const metro2Data = {
        "Email Address": user?.email,
        "Portfolio Type": "O",
        "Account Type": 29,
        "Date Opened": "",
        "Highest Credit": data.rentAmount,
        "Terms Duration": "001",
        "Terms Frequency": "M",
        "Scheduled Monthly Payment Amount": user["custom:MonthlyRent"],
        "Actual Payment Amount": data.rentAmount,
        "Account Status": "11",
        "Payment History Profile": "BBBBBBBBBBBBBBBBBBBBBBBB",
        "Current Balance": Math.abs(
          (user["custom:MonthlyRent"] || 0) - data.rentAmount
        ),
        "Date of Account Information": data.paymentDate,
        Surname: user.family_name,
        "First Name": user.given_name,
        "Middle Name": user.middle_name,
        "Social Security Number": data.sin,
        "Date of Birth": user.birthdate,
        "Telephone Number": data.phoneNumber,
        "Country Code": data.newAddress?.countryCode || user["custom:country"],
        "First Line of Address": data.addressChanged
          ? data.newAddress?.address1
          : user.address,
        "Second Line of Address": data.addressChanged
          ? data.newAddress?.address2
          : "",
        City: data.addressChanged ? data.newAddress?.city : user["custom:city"],
        "Province/State": data.addressChanged
          ? data.newAddress?.provinceState
          : user["custom:province"],
        "Postal/ZIP Code": data.addressChanged
          ? data.newAddress?.postalZipCode
          : user["custom:postal_code"],
        // Back rent specific fields
        "Back Rent Reporting": true,
        "Back Reporting Start Date": data.startDate,
        "Back Reporting End Date": data.paymentDate,
      };
      const formData = {
        userSub: user?.sub, // Include userSub for signed-in users
        rentAmount: data.rentAmount,
        name: user?.given_name + " " + user?.family_name, //cognito last name
        addressChanged: data.addressChanged,
        reportId: user?.sub + "-" + data.paymentDate.toISOString(),
        paymentDate: data.paymentDate.toISOString(),
        receiptS3Key: s3Key, // Include S3 key for later use
        backRentReport: true,
        status: "N/A", // 'Late' if after 5th of month, 'Reported' otherwise
      };

      // Submit form data to main API endpoint
      const submitBaseUrl =
        import.meta.env.VITE_RENT_REPORTS_API_BASE_URL ||
        "https://yipdy0po78.execute-api.us-west-2.amazonaws.com/rent-reports";

      const submitResponse = await fetch(submitBaseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!submitResponse.ok) {
        throw new Error("Failed to submit form data");
      }

      const result = await submitTenantData(metro2Data);

      if (result.success) {
        showToast("Back rent payment submitted successfully!", "success");
        try {
          // ✅ ADD THIS: Mark purchase as reported after successful submission
          const markReportedResponse = await fetch(
            "https://q2ffiqyuv8.execute-api.us-west-2.amazonaws.com",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.tokens?.idToken?.toString()}`, // if using Cognito auth
              },
              body: JSON.stringify({
                userSub: user.sub,
              }),
            }
          );

          if (!markReportedResponse.ok) {
            console.warn(
              "Failed to mark purchase as reported, but form was submitted"
            );
            // Don't throw error here - form was already submitted successfully
          }
        } catch (markError) {
          console.warn("Error marking purchase as reported:", markError);
        }
        form.reset();
      } else {
        showToast(
          result.message || "Failed to submit back rent payment",
          "error"
        );
      }
    } catch (error: any) {
      console.error("Error submitting back rent payment proof:", error);
      showToast(
        error.message ||
          "An error occurred while submitting your back rent payment",
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
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-slate-600 dark:text-slate-400">
                {checkingPurchase
                  ? "Checking purchase status..."
                  : "Loading..."}
              </p>
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
                      This form is for one-time use only. To submit another
                      12-month period of back rent reporting, you must purchase
                      the product again.
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

                  <FormField
                    control={form.control}
                    name="confirmationNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmation Number</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter confirmation number"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="(555) 123-4567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="rentAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rent Amount ($)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="1200"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseFloat(e.target.value) || 0)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reporting Period Start Date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            min={getMinStartDate()}
                            max={
                              new Date(
                                today.getFullYear(),
                                today.getMonth() - 2,
                                1
                              )
                                .toISOString()
                                .split("T")[0]
                            }
                            value={
                              field.value
                                ? field.value.toISOString().split("T")[0]
                                : ""
                            }
                            onChange={(e) => {
                              field.onChange(new Date(e.target.value));
                              // Trigger validation for both fields when start date changes
                              setTimeout(() => {
                                form.trigger(["startDate", "paymentDate"]);
                              }, 0);
                            }}
                            onBlur={() => {
                              form.trigger("startDate");
                            }}
                          />
                        </FormControl>
                        <FormDescription>
                          The start date of the period you want to report
                          (minimum 12 months ago)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="paymentDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reporting Period End Date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            min={
                              form.watch("startDate")
                                ? new Date(
                                    form.watch("startDate").getFullYear(),
                                    form.watch("startDate").getMonth() + 1,
                                    1
                                  )
                                    .toISOString()
                                    .split("T")[0]
                                : undefined
                            }
                            max={
                              new Date(today.getFullYear(), today.getMonth(), 0)
                                .toISOString()
                                .split("T")[0]
                            }
                            value={
                              field.value
                                ? field.value.toISOString().split("T")[0]
                                : ""
                            }
                            onChange={(e) => {
                              field.onChange(new Date(e.target.value));
                              // Trigger validation for both fields when end date changes
                              setTimeout(() => {
                                form.trigger(["startDate", "paymentDate"]);
                              }, 0);
                            }}
                            onBlur={() => {
                              // Trigger validation on blur
                              form.trigger(["startDate", "paymentDate"]);
                            }}
                          />
                        </FormControl>
                        <FormDescription>
                          The end date of the period you want to report
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="addressChanged"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Has your address changed?</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={(value) =>
                              field.onChange(value === "true")
                            }
                            value={field.value ? "true" : "false"}
                            className="flex flex-col space-y-1"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="false" id="no-change" />
                              <label htmlFor="no-change">
                                No, use current address
                              </label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="true" id="changed" />
                              <label htmlFor="changed">
                                Yes, provide new address
                              </label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {form.watch("addressChanged") && (
                    <div className="space-y-4 p-4 border rounded-lg bg-slate-50 dark:bg-slate-800">
                      <h3 className="font-medium">New Address</h3>

                      <FormField
                        control={form.control}
                        name="newAddress.address1"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Address Line 1</FormLabel>
                            <FormControl>
                              <Input placeholder="123 Main Street" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="newAddress.address2"
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
                          name="newAddress.city"
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
                          name="newAddress.provinceState"
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
                          name="newAddress.postalZipCode"
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
                          name="newAddress.countryCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Country Code</FormLabel>
                              <FormControl>
                                <Select
                                  value={field.value}
                                  onValueChange={field.onChange}
                                  defaultValue="CN"
                                >
                                  <SelectTrigger
                                    className={cn(
                                      "w-full",
                                      form.formState.errors.newAddress
                                        ?.countryCode &&
                                        "border-red-500 focus-visible:ring-red-500"
                                    )}
                                  >
                                    {field.value !== "CN" ? "USA" : "Canada"}
                                  </SelectTrigger>
                                  <SelectContent
                                    style={{ zIndex: 9999 }}
                                    className="dark:!bg-slate-80  !bg-white dark:!border-slate-600 !border-white dark:!text-white !text-black"
                                  >
                                    <SelectGroup>
                                      <SelectLabel>Country</SelectLabel>
                                      <SelectItem value="CN">Canada</SelectItem>
                                      <SelectItem value="US">USA</SelectItem>
                                    </SelectGroup>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="rentReceipt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rent Receipt (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            className="dark:!text-white text-black"
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              field.onChange(file);
                            }}
                          />
                        </FormControl>
                        <FormDescription>
                          Upload a receipt or proof of payment (PDF, JPG, PNG)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full text-white"
                    size="lg"
                  >
                    {isLoading
                      ? "Submitting..."
                      : "Submit Back Rent Payment Proof"}
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
