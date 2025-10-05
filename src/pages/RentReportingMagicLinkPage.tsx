import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
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
import { Toast } from "../components/ui/toast";
import { submitTenantData } from "../lib/submit-tenant-data";

// Form validation schema
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
  );

type FormValues = z.infer<typeof formSchema>;

export default function RentReportingMagicLinkPage() {
  const [searchParams] = useSearchParams();
  const maskedToken = searchParams.get("token");

  const [isLoading, setIsLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [userSub, setUserSub] = useState<string | null>(null);
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

  // Validate token and fetch user data on component mount
  useEffect(() => {
    const validateTokenAndFetchData = async () => {
      if (!maskedToken) {
        setIsValidToken(false);
        showToast("Invalid or missing token", "error");
        return;
      }

      try {
        // Decode the masked token
        const tokenData = JSON.parse(atob(maskedToken));

        // Check expiry
        if (Date.now() > tokenData.exp) {
          setIsValidToken(false);
          showToast(
            "This link has expired. Please request a new one.",
            "error"
          );
          return;
        }

        // Set userSub and mark token as valid
        setUserSub(tokenData.userSub);
        setIsValidToken(true);

        // Fetch real user data from Cognito via API
        try {
          const response = await fetch(
            `https://y1klul5kx1.execute-api.us-west-2.amazonaws.com/user-data?userSub=${encodeURIComponent(
              tokenData.userSub
            )}`
          );

          if (!response.ok) {
            throw new Error("Failed to fetch user data");
          }

          const { userData: fetchedUserData } = await response.json();
          setUserData(fetchedUserData);
        } catch (fetchError) {
          console.error("Error fetching user data:", fetchError);
          // Fallback to mock data if API fails
          setUserData({
            userSub: tokenData.userSub,
            phone_number: "+1234567890", // Mock data
            custom: {
              MonthlyRent: 1500, // Mock data
            },
          });
          showToast(
            "Using default data - some fields may need manual entry",
            "error"
          );
        }
      } catch (error) {
        console.error("Error validating token:", error);
        setIsValidToken(false);
        showToast("Invalid token format", "error");
      }
    };

    validateTokenAndFetchData();
  }, [maskedToken]);

  // Note: No Cognito address updates for magic link users since they're not logged in

  //console.log({ user, },user["custom:MonthlyRent"]); // This effect runs whenever the 'user' object changes

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sin: "",
      confirmationNumber: "",
      phoneNumber: "",
      rentAmount: undefined,
      addressChanged: false,
      newAddress: null,
      paymentDate: undefined,
      rentReceipt: undefined,
    },
  });

  // Update form when user data becomes available
  React.useEffect(() => {
    if (userData && isValidToken) {
      form.reset({
        sin: "",
        confirmationNumber: "",
        phoneNumber: userData.phone_number || userData.phoneNumber || "",
        rentAmount: userData.custom?.MonthlyRent
          ? Number(userData.custom.MonthlyRent)
          : undefined,
        addressChanged: false,
        newAddress: null,
        paymentDate: undefined,
        rentReceipt: undefined,
      });
    }
  }, [userData, isValidToken, form]);

  // Handle rent receipt upload to S3
  const uploadRentReceipt = async (file: File): Promise<string | null> => {
    console.log("Uploading rent receipt:", file.name);

    if (!userSub) {
      throw new Error("No valid userSub provided");
    }

    // Get presigned URL from API
    const response = await fetch("/api/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userSub: userSub, // Include userSub for magic link uploads
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

    if (!userSub || !isValidToken) {
      showToast("Invalid or missing user data", "error");
      return;
    }

    try {
      setIsLoading(true);

      // Handle rent receipt upload if present
      let s3Key = null;
      if (data.rentReceipt) {
        s3Key = await uploadRentReceipt(data.rentReceipt);
      }

      // Determine status based on current date
      const today = new Date();
      const currentDay = today.getDate();
      const status = currentDay > 7 ? "Late" : "Reported";

      // Prepare form data for submission
      const metro2Data = {
        email: userData?.email,
        "Portfolio Type": "O",
        "Account Type": 29,
        "Date Opened": "", //
        "Highest Credit": data.rentAmount,
        "Terms Duration": "001",
        "Terms Frequency": "M",
        "Scheduled Monthly Payment Amount": userData?.custom?.MonthlyRent, //
        "Actual Payment Amount": data.rentAmount,
        "Account Status": "11",
        "Payment History Profile": "BBBBBBBBBBBBBBBBBBBBBBBB",
        "Current Balance": Math.floor(
          (userData?.custom?.MonthlyRent || 0) - data.rentAmount
        ),
        "Date of Account Information": data.paymentDate, //chech this
        "Date of Last Payment": "",
        Surname: userData?.family_name, //cognito last name
        "First Name": userData?.given_name,
        "Middle Name": userData?.middle_name,
        "Social Security Number": data.sin,
        "Date of Birth": userData?.birthdate, //cognito birthdate
        "Telephone Number": data.phoneNumber,
        "Country Code":
          data.newAddress?.countryCode || userData?.custom?.country,
        "First Line of Address": data.addressChanged
          ? data.newAddress?.address1
          : userData?.address,
        "Second Line of Address": data.addressChanged
          ? data.newAddress?.address2
          : userData?.custom?.address_2,
        City: data.addressChanged
          ? data.newAddress?.city
          : userData?.custom?.city,
        "State / Province Code": data.addressChanged
          ? data.newAddress?.provinceState
          : userData?.custom?.province,
        "Zip Code": data.addressChanged
          ? data.newAddress?.postalZipCode
          : userData?.custom?.postal_code,
      };
      const formData = {
        userSub: userSub, // Include userSub for magic link submissions
        rentAmount: data.rentAmount,
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
        },
        body: JSON.stringify(formData),
      });

      if (!submitResponse.ok) {
        throw new Error("Failed to submit form data");
      }

      const submitResult = await submitResponse.json();
      console.log("Form submitted successfully!", submitResult);

      // Update address in Cognito if changed
      if (data.addressChanged && data.newAddress) {
        try {
          const updateResponse = await fetch(
            "https://y1klul5kx1.execute-api.us-west-2.amazonaws.com/user-data",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                userSub: userSub,
                newAddress: data.newAddress,
              }),
            }
          );

          if (updateResponse.ok) {
            const updateResult = await updateResponse.json();
            console.log("Address updated successfully:", updateResult);
          } else {
            console.error(
              "Failed to update address:",
              await updateResponse.text()
            );
          }
        } catch (addressError) {
          console.error("Error updating address:", addressError);
          // Don't fail the entire submission if address update fails
        }
      }

      // Submit tenant data to Lambda
      try {
        const tenantDataResult = await submitTenantData(metro2Data);
        if (tenantDataResult.success) {
          console.log(
            "Tenant data submitted successfully:",
            tenantDataResult.message
          );
        } else {
          console.error(
            "Failed to submit tenant data:",
            tenantDataResult.message
          );
        }
      } catch (tenantDataError) {
        console.error("Error submitting tenant data:", tenantDataError);
        // Don't fail the entire submission if tenant data submission fails
      }

      // Show success toast with current month
      const currentMonth = new Date().toLocaleString("default", {
        month: "long",
      });
      const successMessage = data.addressChanged
        ? `Rent Report for ${currentMonth} Successful - Address Update Processed`
        : `Rent Report for ${currentMonth} Successful`;
      showToast(successMessage, "success");

      // Clear form fields after successful submission
      form.reset();
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

  // Show loading state while validating token
  if (isValidToken === null) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="space-y-4 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="text-slate-600 dark:text-slate-400">
              Validating access token...
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Show error state if token is invalid
  if (isValidToken === false) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="space-y-4 text-center max-w-md">
            <div className="w-16 h-16 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-red-600 dark:text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-brand dark:text-primary-300">
              Access Denied
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              The access token is invalid or expired. Please check your link or
              request a new one.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
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
            Submit your rent payment proof via magic link access
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 items-start">
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
                      <FormLabel>Payment Confirmation Number </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter confirmation number (Cheque Number or E-transfer ID)"
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
                        ℹ️ Your address update will be processed by our backend
                        system
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
                          min={(() => {
                            const today = new Date();
                            const lastMonth = new Date(
                              today.getFullYear(),
                              today.getMonth() - 1,
                              15
                            );
                            return lastMonth.toISOString().split("T")[0];
                          })()}
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
                            "file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 file:cursor-pointer file:dark:text-black text-gray-900 dark:text-white h-15",
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
        </div>
      </div>
    </AppLayout>
  );
}
