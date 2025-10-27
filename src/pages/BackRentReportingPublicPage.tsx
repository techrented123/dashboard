import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
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
import { Button } from "../components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
} from "../components/ui/select";
import { Toast } from "../components/ui/toast";
import { Plus, X } from "lucide-react";
import logo from "../assets/logo.png";

const today = new Date();

// Enhanced form validation schema for public back rent reporting
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

const formSchema = z
  .object({
    // Personal Information
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Please enter a valid email address"),
    sin: z
      .string()
      .min(9, "SIN must be 9 digits")
      .max(9, "SIN must be 9 digits"),
    phoneNumber: z.string().min(10, "Phone number must be at least 10 digits"),
    dob: z
      .date({ message: "Please select a valid date of birth" })
      .min(new Date("1900-01-01"), "You cannot be born before 1900")
      .max(
        new Date(today.getFullYear() - 18, today.getMonth(), today.getDate()),
        "You must be at least 18 years ago"
      ),
    // Address for first entry
    address1: z.string().min(1, "Address line 1 is required"),
    address2: z.string().optional(),
    city: z.string().min(1, "City is required"),
    provinceState: z.string().min(1, "Province/State is required"),
    postalZipCode: z.string().min(1, "Postal/ZIP code is required"),
    countryCode: z.string().min(1, "Country code is required"),
    // Payment Details - First entry
    rentAmount: z
      .number({ message: "Please enter a valid rent amount" })
      .min(100, "Rent amount must be at least $100"),
    paymentDate: z.date({ message: "Please select a valid payment date" }),
    startDate: z.date({
      message: "Please select a start date for reporting period",
    }),
    rentReceipt: z.instanceof(File).optional(),
    // Additional history entries
    additionalHistory: z.array(historyEntrySchema).optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.paymentDate) {
        const startYear = data.startDate.getFullYear();
        const startMonth = data.startDate.getMonth();
        const endYear = data.paymentDate.getFullYear();
        const endMonth = data.paymentDate.getMonth();
        const totalMonths =
          (endYear - startYear) * 12 + (endMonth - startMonth);
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
      if (data.startDate) {
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();
        const startYear = data.startDate.getFullYear();
        const startMonth = data.startDate.getMonth();
        const yearDiff = startYear - currentYear;
        const monthDiff = startMonth - currentMonth;
        const totalMonthsDiff = yearDiff * 12 + monthDiff;
        return totalMonthsDiff <= 2;
      }
      return true;
    },
    {
      message: "Start date cannot be more than 2 months from the current month",
      path: ["startDate"],
    }
  )
  .refine(
    (data) => {
      // Check if total reporting period spans more than 12 months
      const allEntries = [
        {
          startDate: data.startDate,
          endDate: data.paymentDate,
        },
        ...(data.additionalHistory || []).map((entry) => ({
          startDate: entry.startDate,
          endDate: entry.endDate,
        })),
      ];

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
      path: ["startDate"],
    }
  );

type FormValues = z.infer<typeof formSchema>;

export default function BackRentReportingPublicPage() {
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccessfullySubmitted, setIsSuccessfullySubmitted] = useState(false);
  const [checkingVerification, setCheckingVerification] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<{
    isValid: boolean;
    isReported: boolean;
    email?: string;
    name?: string;
  }>({ isValid: false, isReported: false });
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
      firstName: "",
      lastName: "",
      email: "",
      sin: "",
      phoneNumber: "",
      dob: new Date(),
      address1: "",
      address2: "",
      city: "",
      provinceState: "",
      postalZipCode: "",
      countryCode: "",
      rentAmount: 0,
      paymentDate: new Date(),
      startDate: new Date(),
      rentReceipt: undefined,
      additionalHistory: [],
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

  // Check verification code on mount
  useEffect(() => {
    const verificationCode = searchParams.get("verify");

    const checkVerificationCode = async () => {
      if (!verificationCode) {
        setVerificationStatus({ isValid: false, isReported: false });
        setCheckingVerification(false);
        return;
      }

      try {
        const response = await fetch(
          `https://k9n4kzbes3.execute-api.us-west-2.amazonaws.com/verify/${verificationCode}`
        );

        if (response.ok) {
          const data = await response.json();

          if (data.found && !data.reported) {
            // Valid and not yet used
            setVerificationStatus({
              isValid: true,
              isReported: false,
              email: data.email,
              name: data.name,
            });

            // Pre-fill form with verified info
            if (data.email) form.setValue("email", data.email);
            if (data.name) {
              const names = data.name.split(" ");
              if (names.length >= 2) {
                form.setValue("firstName", names[0]);
                form.setValue("lastName", names.slice(1).join(" "));
              }
            }
          } else if (data.reported) {
            // Already used - show success message
            setVerificationStatus({ isValid: true, isReported: true });
          } else {
            // Invalid
            setVerificationStatus({ isValid: false, isReported: false });
            showToast("Invalid verification code", "error");
          }
        } else {
          setVerificationStatus({ isValid: false, isReported: false });
          showToast("Failed to verify code", "error");
        }
      } catch (error) {
        console.error("Verification error:", error);
        setVerificationStatus({ isValid: false, isReported: false });
        showToast("Error verifying code", "error");
      } finally {
        setCheckingVerification(false);
      }
    };

    checkVerificationCode();
  }, [searchParams]);

  const onSubmit = async (data: FormValues) => {
    console.log("Public back rent reporting form submitted:", data);

    try {
      setIsLoading(true);

      // Build history entries array
      const historyEntries = [];

      // Add first entry (from main form fields)
      historyEntries.push({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        sin: data.sin,
        phoneNumber: data.phoneNumber,
        dob: data.dob.toISOString(),
        address1: data.address1,
        address2: data.address2,
        city: data.city,
        provinceState: data.provinceState,
        postalZipCode: data.postalZipCode,
        countryCode: data.countryCode,
        rentAmount: data.rentAmount,
        startDate: data.startDate.toISOString(),
        endDate: data.paymentDate.toISOString(),
        receiptFile: data.rentReceipt?.name,
      });

      // Add additional history entries if any
      if (data.additionalHistory && data.additionalHistory.length > 0) {
        data.additionalHistory.forEach((entry) => {
          historyEntries.push({
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            sin: data.sin,
            phoneNumber: data.phoneNumber,
            dob: data.dob.toISOString(),
            address1: entry.address1,
            address2: entry.address2,
            city: entry.city,
            provinceState: entry.provinceState,
            postalZipCode: entry.postalZipCode,
            countryCode: entry.countryCode,
            rentAmount: entry.rentAmount,
            startDate: entry.startDate.toISOString(),
            endDate: entry.endDate.toISOString(),
          });
        });
      }

      // Mark purchase as reported
      const verificationCode = searchParams.get("verify");
      if (verificationCode) {
        try {
          await fetch(
            `https://mg9mbr6g5i.execute-api.us-west-2.amazonaws.com/mark-reported`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ verificationCode, historyEntries }),
            }
          );
        } catch (err) {
          console.error("Failed to mark as reported:", err);
        }
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

  const getMinStartDate = (): string => {
    const minDate = new Date(today.getFullYear() - 1, today.getMonth() - 1, 1);
    return minDate.toISOString().split("T")[0];
  };

  const getMaxStartDate = (): string => {
    const maxDate = new Date(today.getFullYear(), today.getMonth() - 2, 1);
    return maxDate.toISOString().split("T")[0];
  };

  const getMaxEndDate = (): string => {
    const maxDate = new Date(today.getFullYear(), today.getMonth(), 0);
    return maxDate.toISOString().split("T")[0];
  };

  // Show loading while checking verification
  if (checkingVerification) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        {/* Header with Logo */}
        <header className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex justify-center items-center">
          <div className="container mx-auto px-4 py-4 ">
            <img src={logo} alt="Rented123" className="h-20" />
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-slate-600 dark:text-slate-400">
              Verifying your purchase...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show success screen if form was successfully submitted or already reported
  if (isSuccessfullySubmitted || verificationStatus.isReported) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        {/* Header with Logo */}
        <header className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <div className="container mx-auto px-4 py-4 flex justify-center items-center">
            <img src={logo} alt="Rented123" className="h-20" />
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          <Toast
            message={toast.message}
            type={toast.type}
            isVisible={toast.isVisible}
            onClose={() => setToast((prev) => ({ ...prev, isVisible: false }))}
          />
          <div className="space-y-8 max-w-5xl mx-auto">
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
                {isSuccessfullySubmitted
                  ? "Thank You!"
                  : "You've Already Reported"}
              </h2>

              <p className="text-xl text-slate-600 dark:text-slate-400 mb-8">
                {isSuccessfullySubmitted
                  ? "Your rent has been reported to the credit bureau"
                  : "You have already submitted your back rent report"}
              </p>

              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-6 max-w-2xl mx-auto mb-8">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Now you've reported past rents, want to see more positive
                  impact on your credit?
                </h3>
                <p className="text-white mb-6">
                  Sign up to report your monthly rent payments and build your
                  credit history continuously.
                </p>

                <Button
                  onClick={() => (window.location.href = "/register")}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white sm:w-auto"
                  size="lg"
                >
                  Sign up to report monthly
                </Button>
              </div>

              <p className="text-sm text-slate-500 dark:text-slate-500">
                Your submission has been recorded. You will receive a
                confirmation email shortly.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header with Logo */}
      <header className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="container mx-auto px-4 py-4 flex justify-center items-center">
          <img src={logo} alt="Rented123" className="h-20" />
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={toast.isVisible}
          onClose={() => setToast((prev) => ({ ...prev, isVisible: false }))}
        />
        <div className="space-y-8">
          <div>
            <h1 className="text-2xl font-bold text-brand dark:text-primary-300 mb-2">
              Back Rent Reporting - Public Form
            </h1>
            <p className="text-base text-slate-600 dark:text-slate-400 font-medium">
              Submit your historical rent payment proof to improve your credit
              score
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-1 gap-4 items-start mx-auto">
            <Card title="Submit Back Rent Payment Proof">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  {/* Personal Information */}
                  <div className="border-b dark:border-slate-700 pb-4">
                    <h3 className="text-lg font-semibold mb-4">
                      Personal Information
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem className="mb-6">
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem className="mb-6">
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="john@example.com"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="sin"
                      render={({ field }) => (
                        <FormItem className="mb-6">
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
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem className="mb-6">
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
                      name="dob"
                      render={({ field }) => (
                        <FormItem className="mb-6">
                          <FormLabel>Date of Birth</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                              value={
                                field.value instanceof Date
                                  ? field.value.toISOString().split("T")[0]
                                  : field.value
                              }
                              onChange={(e) => {
                                const date = e.target.value
                                  ? new Date(e.target.value)
                                  : new Date();
                                field.onChange(date);
                              }}
                              max={
                                new Date(
                                  today.getFullYear() - 18,
                                  today.getMonth(),
                                  today.getDate()
                                )
                                  .toISOString()
                                  .split("T")[0]
                              }
                              min="1900-01-01"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Payment Details for First Entry */}
                  <div className="border-b dark:border-slate-700 pb-4">
                    <h3 className="text-lg font-semibold mb-4">
                      Rental History #1
                    </h3>

                    {/* Address Fields for First Entry */}
                    <FormField
                      control={form.control}
                      name="address1"
                      render={({ field }) => (
                        <FormItem className="mb-6">
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
                      name="address2"
                      render={({ field }) => (
                        <FormItem className="mb-6">
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
                        name="city"
                        render={({ field }) => (
                          <FormItem className="mb-6">
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
                        name="provinceState"
                        render={({ field }) => (
                          <FormItem className="mb-6">
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
                        name="postalZipCode"
                        render={({ field }) => (
                          <FormItem className="mb-6">
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
                        name="countryCode"
                        render={({ field }) => (
                          <FormItem className="mb-6">
                            <FormLabel>Country</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="w-full text-white">
                                  <SelectContent className="bg-slate-800 border-slate-600 text-white">
                                    <SelectGroup>
                                      <SelectLabel className="text-slate-300">
                                        Countries
                                      </SelectLabel>
                                      <SelectItem
                                        value="CA"
                                        className="text-white hover:bg-slate-700 focus:bg-slate-700"
                                      >
                                        Canada
                                      </SelectItem>
                                      <SelectItem
                                        value="US"
                                        className="text-white hover:bg-slate-700 focus:bg-slate-700"
                                      >
                                        United States
                                      </SelectItem>
                                      <SelectItem
                                        value="MX"
                                        className="text-white hover:bg-slate-700 focus:bg-slate-700"
                                      >
                                        Mexico
                                      </SelectItem>
                                    </SelectGroup>
                                  </SelectContent>
                                </SelectTrigger>
                              </FormControl>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem className="mb-6">
                          <FormLabel>Reporting Period Start Date</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                              min={getMinStartDate()}
                              max={getMaxStartDate()}
                              value={
                                field.value
                                  ? field.value.toISOString().split("T")[0]
                                  : ""
                              }
                              onChange={(e) => {
                                field.onChange(new Date(e.target.value));
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
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="paymentDate"
                      render={({ field }) => (
                        <FormItem className="mb-6">
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
                              max={getMaxEndDate()}
                              value={
                                field.value
                                  ? field.value.toISOString().split("T")[0]
                                  : ""
                              }
                              onChange={(e) => {
                                field.onChange(new Date(e.target.value));
                                setTimeout(() => {
                                  form.trigger(["startDate", "paymentDate"]);
                                }, 0);
                              }}
                              onBlur={() => {
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
                      name="rentAmount"
                      render={({ field }) => (
                        <FormItem className="mb-6">
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
                  </div>

                  {/* Additional History Section */}
                  {fields.length > 0 && (
                    <div className="border-t dark:border-slate-700 pt-6">
                      <h3 className="text-lg font-semibold mb-4">
                        Additional Rental History
                      </h3>
                      {fields.map((field, index) => (
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
                              onClick={() => remove(index)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="w-4 h-4 mr-1" />
                              Remove
                            </Button>
                          </div>

                          <div className="space-y-4">
                            <FormField
                              control={form.control}
                              name={`additionalHistory.${index}.address1`}
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
                              name={`additionalHistory.${index}.address2`}
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
                                name={`additionalHistory.${index}.city`}
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
                                name={`additionalHistory.${index}.provinceState`}
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
                                name={`additionalHistory.${index}.postalZipCode`}
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
                                name={`additionalHistory.${index}.countryCode`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Country</FormLabel>
                                    <FormControl>
                                      <Select
                                        value={field.value}
                                        onValueChange={field.onChange}
                                      >
                                        <SelectTrigger>
                                          <span className="text-black dark:text-white">
                                            {field.value || "Select country"}
                                          </span>
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-800 text-white border-slate-600">
                                          <SelectGroup>
                                            <SelectLabel>Countries</SelectLabel>
                                            <SelectItem
                                              value="CA"
                                              className="hover:bg-slate-700 focus:bg-slate-700"
                                            >
                                              Canada
                                            </SelectItem>
                                            <SelectItem
                                              value="US"
                                              className="hover:bg-slate-700 focus:bg-slate-700"
                                            >
                                              United States
                                            </SelectItem>
                                            <SelectItem
                                              value="MX"
                                              className="hover:bg-slate-700 focus:bg-slate-700"
                                            >
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

                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name={`additionalHistory.${index}.startDate`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Start Date</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="date"
                                        {...field}
                                        min={getMinStartDate()}
                                        max={getMaxStartDate()}
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
                                name={`additionalHistory.${index}.endDate`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>End Date</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="date"
                                        {...field}
                                        max={getMaxEndDate()}
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

                            <FormField
                              control={form.control}
                              name={`additionalHistory.${index}.rentAmount`}
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
                  <div className="flex justify-center">
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
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    size="lg"
                  >
                    {isLoading ? "Submitting..." : "Submit Back Rent Payments"}
                  </Button>
                </form>
              </Form>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
