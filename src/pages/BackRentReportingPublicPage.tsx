import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
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

const today = new Date();

// Enhanced form validation schema for public back rent reporting
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

    // Address
    address1: z.string().min(1, "Address line 1 is required"),
    address2: z.string().optional(),
    city: z.string().min(1, "City is required"),
    provinceState: z.string().min(1, "Province/State is required"),
    postalZipCode: z.string().min(1, "Postal/ZIP code is required"),
    countryCode: z.string().min(1, "Country code is required"),

    // Payment Details
    rentAmount: z
      .number({ message: "Please enter a valid rent amount" })
      .min(100, "Rent amount must be at least $100"),
    paymentDate: z.date({ message: "Please select a valid payment date" }),
    startDate: z.date({
      message: "Please select a start date for reporting period",
    }),
    rentReceipt: z.instanceof(File).optional(),
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
  );

type FormValues = z.infer<typeof formSchema>;

export default function BackRentReportingPublicPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
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
    },
  });

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type, isVisible: true });
    setTimeout(() => setToast((prev) => ({ ...prev, isVisible: false })), 5000);
  };

  const onSubmit = async (data: FormValues) => {
    console.log("Public back rent reporting form submitted:", data);

    try {
      setIsLoading(true);

      // Prepare form data for submission
      const formData = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        sin: data.sin,
        phoneNumber: data.phoneNumber,
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
      };

      // Submit to API (implement actual endpoint)
      const submitResponse = await fetch(
        "https://yipdy0po78.execute-api.us-west-2.amazonaws.com/rent-reports/public",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );

      if (!submitResponse.ok) {
        throw new Error("Failed to submit form data");
      }

      showToast("Back rent payment proof submitted successfully!", "success");
      form.reset();

      // Redirect to thank you page or purchase completion
      setTimeout(() => {
        navigate("/public-purchase/back-rent-report?success=true");
      }, 2000);
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

  return (
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
            Back Rent Reporting - Public Form
          </h1>
          <p className="text-base text-slate-600 dark:text-slate-400 font-medium">
            Submit your historical rent payment proof to improve your credit
            score
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-1 gap-4 items-start">
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
                        <FormItem>
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
                      <FormItem>
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
                </div>

                {/* Address Information */}
                <div className="border-b dark:border-slate-700 pb-4">
                  <h3 className="text-lg font-semibold mb-4">
                    Address Information
                  </h3>

                  <FormField
                    control={form.control}
                    name="address1"
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
                    name="address2"
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
                      name="city"
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
                      name="provinceState"
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
                      name="postalZipCode"
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
                      name="countryCode"
                      render={({ field }) => (
                        <FormItem>
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
                </div>

                {/* Payment Details */}
                <div className="border-b dark:border-slate-700 pb-4">
                  <h3 className="text-lg font-semibold mb-4">
                    Payment Details
                  </h3>

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
                    name="rentReceipt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rent Receipt (Optional)</FormLabel>
                        <FormControl>
                          <Input
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
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full"
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
  );
}
