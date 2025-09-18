import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import ProtectedRoute from "../components/ProtectedRoute";
import AppLayout from "../components/AppLayout";
import Card from "../components/Card";
import { useAuth } from "../lib/context/authContext";
import { useRentReports } from "../lib/hooks/useRentReports";
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
import { fetchAuthSession, updateUserAttributes } from "aws-amplify/auth";
import { Toast } from "../components/ui/toast";
import { Skeleton } from "../components/Skeleton";

// Form validation schema
const formSchema = z.object({
  sin: z.string().min(9, "SIN must be 9 digits").max(9, "SIN must be 9 digits"),
  confirmationNumber: z.string().min(1, "Confirmation number is required"),
  phoneNumber: z.string().min(10, "Phone number must be at least 10 digits"),
  rentAmount: z.number().min(0, "Rent amount must be positive"),
  addressChanged: z.boolean(),
  newAddress: z
    .object({
      address1: z.string().optional(),
      address2: z.string().optional(),
      city: z.string().optional(),
      provinceState: z.string().optional(),
      postalZipCode: z.string().optional(),
      countryCode: z.string().optional(),
    })
    .nullable(),
  paymentDate: z.date(),
  rentReceipt: z.instanceof(File).optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function RentReportingPage() {
  const { user, isLoading: loadingUser } = useAuth();
  const {
    rentReports,
    isLoading: isRefreshingReports,
    refreshRentReports,
  } = useRentReports();

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

  // Toast helper functions
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type, isVisible: true });
  };

  const hideToast = () => {
    setToast((prev) => ({ ...prev, isVisible: false }));
  };

  // Function to update Cognito user attributes with new address
  const updateCognitoAddress = async (newAddress: any) => {
    try {
      const attributesToUpdate: any = {};

      if (newAddress.address1) {
        attributesToUpdate.address = newAddress.address1;
      }
      if (newAddress.address2) {
        attributesToUpdate["custom:address_2"] = newAddress.address2;
      }
      if (newAddress.city) {
        attributesToUpdate["custom:city"] = newAddress.city;
      }
      if (newAddress.provinceState) {
        attributesToUpdate["custom:province"] = newAddress.provinceState;
      }
      if (newAddress.postalZipCode) {
        attributesToUpdate["custom:postal_code"] = newAddress.postalZipCode;
      }
      if (newAddress.countryCode) {
        attributesToUpdate["custom:country"] =
          newAddress.countryCode === "CN" ? "Canada" : "USA";
      }

      await updateUserAttributes({ userAttributes: attributesToUpdate });
      console.log("Successfully updated Cognito user address attributes");
    } catch (error) {
      console.error("Error updating Cognito address:", error);
      throw new Error("Failed to update address on file");
    }
  };

  // Placeholder function for previewing receipts
  const handlePreview = (docId: string) => {
    console.log("Preview receipt:", docId);
    // TODO: Implement receipt preview functionality
  };

  //console.log({ user, },user["custom:MonthlyRent"]); // This effect runs whenever the 'user' object changes

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sin: "",
      confirmationNumber: "",
      phoneNumber: user?.phone_number || user?.phoneNumber || "",
      rentAmount: (user && Number(user["custom:MonthlyRent"])) || undefined,

      addressChanged: false,
      newAddress: null,
      paymentDate: undefined,
      rentReceipt: undefined,
    },
  });

  // Update form when user data becomes available
  React.useEffect(() => {
    if (user && !loadingUser) {
      form.reset({
        sin: "",
        confirmationNumber: "",
        phoneNumber: user?.phone_number || user?.phoneNumber || "",
        rentAmount: (user && Number(user["custom:MonthlyRent"])) || undefined,

        addressChanged: false,
        newAddress: null,
        paymentDate: undefined,
        rentReceipt: undefined,
      });
    }
  }, [user, loadingUser, form]);

  // Handle rent receipt upload to S3
  const uploadRentReceipt = async (
    file: File,
    token: string
  ): Promise<string | null> => {
    console.log("Uploading rent receipt:", file.name);

    // Get presigned URL from API
    const response = await fetch("/api/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to get upload URL");
    }

    const { uploadUrl, key } = await response.json();

    // Upload file to S3
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
      },
    });

    if (!uploadResponse.ok) {
      throw new Error("Failed to upload file to S3");
    }

    console.log("Receipt uploaded successfully, S3 key:", key);
    return key;
  };

  // Main form submission handler
  const onSubmit = async (data: FormValues) => {
    console.log("Form submitted:", data);

    try {
      setIsLoading(true);

      // Get authentication token
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      if (!token) {
        throw new Error("User is not authenticated.");
      }

      // Handle rent receipt upload if present
      let s3Key = null;
      if (data.rentReceipt) {
        s3Key = await uploadRentReceipt(data.rentReceipt, token);
      }

      // Determine status based on current date
      const today = new Date();
      const currentDay = today.getDate();
      const status = currentDay > 5 ? "Late" : "Reported";

      // Prepare form data for submission
      const formData = {
        sin: data.sin,
        confirmationNumber: data.confirmationNumber,
        phoneNumber: data.phoneNumber,
        rentAmount: data.rentAmount,
        addressChanged: data.addressChanged,
        newAddress: data.newAddress,
        paymentDate: data.paymentDate.toISOString(),
        receiptS3Key: s3Key, // Include S3 key for later use
        status: status, // 'Late' if after 5th of month, 'Reported' otherwise
      };

      console.log("Submitting form data:", formData);

      // Submit form data to main API endpoint
      const submitResponse = await fetch("/api/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!submitResponse.ok) {
        throw new Error("Failed to submit form data");
      }

      const submitResult = await submitResponse.json();
      console.log("Form submitted successfully!", submitResult);

      // Update Cognito address if address was changed
      if (data.addressChanged && data.newAddress) {
        try {
          await updateCognitoAddress(data.newAddress);
          console.log("Successfully updated address in Cognito");
        } catch (addressError) {
          console.error("Failed to update address:", addressError);
          // Don't fail the entire submission if address update fails
          showToast(
            "Rent reported successfully, but address update failed",
            "error"
          );
          return;
        }
      }

      // Show success toast with current month
      const currentMonth = new Date().toLocaleString("default", {
        month: "long",
      });
      const successMessage = data.addressChanged
        ? `Rent Report for ${currentMonth} Successful - Address Updated`
        : `Rent Report for ${currentMonth} Successful`;
      showToast(successMessage, "success");

      // Refresh rent reports after successful submission
      // Add a small delay to ensure backend has processed the data
      setTimeout(async () => {
        console.log("Refreshing rent reports after successful submission...");
        await refreshRentReports(); // Use cached hook to refresh
      }, 1000);
    } catch (error) {
      console.error("Error submitting form:", error);

      // Show error toast
      const errorMessage =
        error instanceof Error ? error.message : "Failed to submit rent report";
      showToast(errorMessage, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <AppLayout>
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={toast.isVisible}
          onClose={hideToast}
        />
        <div className="space-y-8">
          <div>
            <h1 className="text-2xl font-bold text-brand dark:text-primary-300 mb-2">
              Rent Reporting
            </h1>
            <p className="text-base text-slate-600 dark:text-slate-400 font-medium">
              Submit your rent payment proof and track your reporting history
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            <Card title="Submit Rent Payment Proof">
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
                        <FormLabel>Social Insurance Number (SIN)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter your 9-digit SIN"
                            {...field}
                            maxLength={9}
                            pattern="\d*"
                            inputMode="numeric"
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, "");
                              field.onChange(value);
                            }}
                            className={cn(
                              form.formState.errors.sin &&
                                "border-red-500 focus-visible:ring-red-500"
                            )}
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Your SIN is required for rent reporting and is deleted
                          after reporting.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmationNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Confirmation Number</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter confirmation number"
                            {...field}
                            maxLength={32}
                            className={cn(
                              form.formState.errors.confirmationNumber &&
                                "border-red-500 focus-visible:ring-red-500"
                            )}
                          />
                        </FormControl>

                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="(123) 456-7890"
                              {...field}
                              className={cn(
                                form.formState.errors.phoneNumber &&
                                  "border-red-500 focus-visible:ring-red-500"
                              )}
                            />
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
                              step="5"
                              placeholder="Enter rent amount"
                              {...field}
                              onChange={(e) => {
                                const value =
                                  e.target.value &&
                                  Math.max(0, parseFloat(e.target.value) || 0);
                                field.onChange(value);
                              }}
                              className={cn(
                                form.formState.errors.rentAmount &&
                                  "border-red-500 focus-visible:ring-red-500"
                              )}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="addressChanged"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Has your address changed?</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={(value) => {
                              const isChanged = value === "true";
                              field.onChange(isChanged);
                              if (!isChanged) {
                                form.setValue("newAddress", null);
                              } else {
                                form.setValue("newAddress", {
                                  address1: "",
                                  address2: "",
                                  city: "",
                                  provinceState: "",
                                  postalZipCode: "",
                                  countryCode: "CN",
                                });
                              }
                            }}
                            defaultValue={field.value ? "true" : "false"}
                            className="flex flex-row gap-6"
                          >
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="true" />
                              </FormControl>
                              <FormLabel className="font-normal">Yes</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="false" />
                              </FormControl>
                              <FormLabel className="font-normal">No</FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {form.watch("addressChanged") && (
                    <div className="space-y-4">
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl">
                        <p className="text-sm text-blue-700 dark:text-blue-400 font-medium">
                          ℹ️ This will update your address on file
                        </p>
                      </div>
                      <FormField
                        control={form.control}
                        name="newAddress.address1"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Address Line 1</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Street address"
                                {...field}
                                className={cn(
                                  form.formState.errors.newAddress?.address1 &&
                                    "border-red-500 focus-visible:ring-red-500"
                                )}
                              />
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
                              <Input
                                placeholder="Apartment, suite, unit, etc."
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="newAddress.city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>City</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="City"
                                  {...field}
                                  className={cn(
                                    form.formState.errors.newAddress?.city &&
                                      "border-red-500 focus-visible:ring-red-500"
                                  )}
                                />
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
                                <Input
                                  placeholder="Province or State"
                                  {...field}
                                  className={cn(
                                    form.formState.errors.newAddress
                                      ?.provinceState &&
                                      "border-red-500 focus-visible:ring-red-500"
                                  )}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="newAddress.postalZipCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Postal/ZIP Code</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Postal or ZIP code"
                                  {...field}
                                  className={cn(
                                    form.formState.errors.newAddress
                                      ?.postalZipCode &&
                                      "border-red-500 focus-visible:ring-red-500"
                                  )}
                                />
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
                                  <SelectContent style={{ zIndex: 9999 }}>
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
                    name="paymentDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Payment Date</FormLabel>
                        <FormControl>
                          <input
                            type="date"
                            value={
                              field.value
                                ? field.value.toISOString().split("T")[0]
                                : ""
                            }
                            onChange={(e) => {
                              const dateValue = e.target.value
                                ? new Date(e.target.value)
                                : undefined;
                              field.onChange(dateValue);
                            }}
                            max={new Date().toISOString().split("T")[0]}
                            className="w-full px-3 py-2 border-2 border-gray-300 dark:border-slate-400 rounded-md bg-white dark:bg-slate-800 text-black dark:text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Pick a date"
                          />
                        </FormControl>
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
                            accept=".pdf,.png,.jpg,.jpeg,.webp,.heic,.heif"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                // Validate file type
                                const allowedTypes = [
                                  "application/pdf",
                                  "image/png",
                                  "image/jpeg",
                                  "image/jpg",
                                  "image/webp",
                                  "image/heic",
                                  "image/heif",
                                ];

                                if (!allowedTypes.includes(file.type)) {
                                  form.setError("rentReceipt", {
                                    type: "manual",
                                    message:
                                      "Please upload a PDF or image file (PNG, JPEG, JPG, WebP, HEIC)",
                                  });
                                  return;
                                }

                                // Clear any previous errors
                                form.clearErrors("rentReceipt");
                                field.onChange(file);
                              } else {
                                field.onChange(undefined);
                              }
                            }}
                            className={cn(
                              "file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 file:cursor-pointer file:dark:text-black text-white dark:text-white h-15",
                              form.formState.errors.rentReceipt &&
                                "border-red-500 focus-visible:ring-red-500"
                            )}
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Upload a PDF or image of your rent receipt for
                          verification
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full bg-[#077BFB] hover:bg-[#077BFB]/90 text-white font-medium py-3 rounded-lg transition-colors"
                    disabled={isLoading}
                  >
                    {isLoading ? "Submitting..." : "Submit"}
                  </Button>
                </form>
              </Form>
            </Card>

            <Card title="Reporting Impact">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm dark:text-slate-300">
                    Rent payments reported
                  </span>
                  <span className="font-semibold dark:text-white">
                    {rentReports.length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm dark:text-slate-300">
                    On-time payments reported
                  </span>
                  <span className="font-semibold text-green-600">
                    {
                      rentReports.filter(
                        (report) => report.status === "Reported"
                      ).length
                    }
                    /{rentReports.length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm dark:text-slate-300">
                    Credit bureaus receiving data
                  </span>
                  <span className="font-semibold dark:text-white">1</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm dark:text-slate-300">
                    Estimated credit impact
                  </span>
                  <span className="font-semibold text-primary-600">
                    +25 points
                  </span>
                </div>
              </div>
            </Card>
          </div>
          <Card
            title={`Reporting History ${
              isRefreshingReports ? "(Updating...)" : ""
            }`}
          >
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-600 dark:text-slate-400 border-b dark:border-slate-600">
                    <th className="py-2 pr-4 font-medium">Month</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 pr-4 font-medium">Amount</th>
                    <th className="py-2 pr-4 font-medium">Receipt</th>
                  </tr>
                </thead>
                <tbody className="align-top">
                  {isRefreshingReports ? (
                    // Show skeleton rows while loading
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="border-b dark:border-slate-600">
                        <td className="py-3 pr-4">
                          <Skeleton className="h-4 w-16" />
                        </td>
                        <td className="py-3 pr-4">
                          <Skeleton className="h-4 w-20" />
                        </td>
                        <td className="py-3 pr-4">
                          <Skeleton className="h-4 w-24" />
                        </td>
                        <td className="py-3 pr-4">
                          <Skeleton className="h-4 w-16" />
                        </td>
                      </tr>
                    ))
                  ) : rentReports.length > 0 ? (
                    rentReports.map((report, i) => {
                      const paymentDate = new Date(report.paymentDate);
                      const month = paymentDate.toLocaleDateString("en-US", {
                        month: "short",
                        year: "numeric",
                      });
                      const statusColor =
                        report.status === "Late"
                          ? "text-yellow-600"
                          : "text-green-600";

                      return (
                        <tr key={i} className="border-b dark:border-slate-600">
                          <td className="py-3 pr-4 dark:text-slate-300">
                            {month}
                          </td>
                          <td
                            className={`py-3 pr-4 font-medium ${statusColor}`}
                          >
                            {report.status}
                          </td>
                          <td className="py-3 pr-4 dark:text-slate-300">
                            ${report.rentAmount?.toLocaleString() || "N/A"}
                          </td>
                          <td className="py-3 pr-4">
                            {report.key ? (
                              <button
                                className="text-secondary hover:underline"
                                onClick={() => handlePreview(report.docId)}
                              >
                                View
                              </button>
                            ) : (
                              <span className="text-slate-400">No receipt</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-8 text-center text-slate-500 dark:text-slate-400"
                      >
                        No rent reports found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
