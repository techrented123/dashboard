import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Upload,
  FileText,
  X,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  Loader2,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "../ui/form";
import { Input } from "../ui/input";
import { Button } from "../components/ui/button";
import { cn, formatPhoneToE164 } from "../lib/utils";
import { useIdVerification } from "../lib/hooks/useIdVerification";
import { verifyPDF } from "../lib/upload";
import logo from "../assets/logo.png";

// Helper component for the password validation checklist
const PasswordRequirement = ({
  isValid,
  children,
}: {
  isValid: boolean;
  children: React.ReactNode;
}) => {
  const color = isValid
    ? "text-green-600 dark:text-green-400"
    : "text-slate-500 dark:text-slate-400";
  const Icon = isValid ? CheckCircle2 : XCircle;
  return (
    <div
      className={`flex items-center gap-2 text-xs transition-colors ${color}`}
    >
      <Icon className="w-4 h-4" />
      <span>{children}</span>
    </div>
  );
};

export interface UserInfoData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  middleName: string;
  phoneNumber: string;
  address: string;
  address2: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  birthdate: string;
  monthlyRent: string;
  ownership: string;
  leaseAgreement: File | null;
  leaseAgreementUrl?: string;
}

// Form validation schema
const formSchema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    username: z.string().min(1, "Username is required"),
    email: z
      .string()
      .min(1, "Email address is required")
      .email("Please enter a valid email address"),
    password: z.string().min(1, "Password is required"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    birthdate: z.string().min(1, "Birth date is required"),
    address: z.string().min(1, "Address is required"),
    city: z.string().min(1, "City is required"),
    province: z.string().min(1, "Province/State is required"),
    postalCode: z.string().min(1, "Postal/ZIP code is required"),
    country: z.string().min(1, "Country is required"),
    phoneNumber: z.string().optional(),
    middleName: z.string().optional(),
    ownership: z.string().min(1, "Please select your role"),
    monthlyRent: z.string().optional(),
    leaseAgreement: z.instanceof(File, {
      message: "Lease agreement is required",
    }),
    idVerificationUpload: z.instanceof(File).optional(),
    idVerificationEmailRequired: z.boolean().optional(),
    termsAndConditions: z.boolean().refine((val) => val === true, {
      message: "You must accept the terms and conditions",
    }),
    privacyPolicy: z.boolean().refine((val) => val === true, {
      message: "You must accept the privacy policy",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine(
    (data) => {
      if (data.phoneNumber && data.phoneNumber.trim()) {
        const digitsOnly = data.phoneNumber.replace(/\D/g, "");
        return digitsOnly.length >= 7 && digitsOnly.length <= 15;
      }
      return true;
    },
    {
      message: "Please enter a valid phone number (7-15 digits)",
      path: ["phoneNumber"],
    }
  )
  .refine(
    (data) => {
      if (data.birthdate) {
        const birthDate = new Date(data.birthdate);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();

        return (
          age > 18 ||
          (age === 18 &&
            monthDiff >= 0 &&
            today.getDate() >= birthDate.getDate())
        );
      }
      return true;
    },
    {
      message: "You must be at least 18 years old to register",
      path: ["birthdate"],
    }
  )
  .refine(
    (data) => {
      if (data.leaseAgreement) {
        const maxSize = 10 * 1024 * 1024; // 10MB in bytes
        return data.leaseAgreement.size <= maxSize;
      }
      return true;
    },
    {
      message: "Lease agreement file must be 10MB or smaller",
      path: ["leaseAgreement"],
    }
  );

type FormValues = z.infer<typeof formSchema>;

export default function RegisterUserInfoPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [emailValue, setEmailValue] = useState("");
  const [shouldCheckId, setShouldCheckId] = useState(false);

  // State for password validation
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    specialChar: false,
  });

  // ID verification check - only when user blurs from email field
  const { data: idVerificationData, isLoading: isCheckingId } =
    useIdVerification(emailValue, shouldCheckId);

  // State for ID verification upload validation
  const [idVerificationUploadStatus, setIdVerificationUploadStatus] = useState<{
    isValid: boolean | null;
    message: string;
    isVerifying: boolean;
  }>({
    isValid: null,
    message: "",
    isVerifying: false,
  });

  // Hover state for ID verification dropzone
  const [isIdDragOver, setIsIdDragOver] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      middleName: " ",
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      birthdate: "",
      phoneNumber: "",
      address: "",
      city: "",
      province: "",
      postalCode: "",
      country: "",
      ownership: "tenant",
      monthlyRent: "",
      leaseAgreement: undefined as any,
      idVerificationUpload: undefined as any,
      idVerificationEmailRequired: false,
      termsAndConditions: false,
      privacyPolicy: false,
    },
  });

  // Reset ID verification upload state when email verification status changes
  useEffect(() => {
    // If email verification found a report, clear any uploaded file and validation status
    if (idVerificationData?.status === "found") {
      setIdVerificationUploadStatus({
        isValid: null,
        message: "",
        isVerifying: false,
      });
      // Clear any uploaded file from form data
      form.setValue("idVerificationUpload", undefined as any);
    }
  }, [idVerificationData?.status, form]);

  // Function to validate ID verification PDF upload
  const validateIdVerificationUpload = async (file: File) => {
    setIdVerificationUploadStatus({
      isValid: null,
      message: "",
      isVerifying: true,
    });

    try {
      const result = await verifyPDF(
        file,
        ["ID Verification Result"], // expectedTitles
        3 // keywordsLength
      );

      setIdVerificationUploadStatus({
        isValid: result.isValid,
        message: result.message,
        isVerifying: false,
      });

      // Set form field
      form.setValue("idVerificationUpload", file);

      // Mark that email requirement is satisfied
      if (result.isValid) {
        form.setValue("idVerificationEmailRequired", true);
      }

      return result.isValid;
    } catch (error) {
      console.error("Error validating ID verification upload:", error);
      setIdVerificationUploadStatus({
        isValid: false,
        message: "Could not verify this PDF file",
        isVerifying: false,
      });
      return false;
    }
  };

  const onSubmit = async (data: FormValues) => {
    // Check ID verification status before proceeding
    if (idVerificationData?.status === "not_found") {
      // If no upload provided, prevent submission
      if (!data.idVerificationUpload || !idVerificationUploadStatus.isValid) {
        // Scroll to top to show the warning
        window.scrollTo({ top: 0, behavior: "smooth" });
        return; // Prevent form submission
      }
    }

    // Format phone number to E.164 format if provided
    if (data.phoneNumber && data.phoneNumber.trim()) {
      data.phoneNumber = formatPhoneToE164(data.phoneNumber);
    }

    // Handle lease agreement file - store only metadata to avoid quota issues
    if (data.leaseAgreement) {
      console.log("file", data.leaseAgreement);

      // Store only metadata in sessionStorage, store the actual file globally
      const fileMetadata = {
        name: data.leaseAgreement.name,
        type: data.leaseAgreement.type,
        size: data.leaseAgreement.size,
        uploaded: true,
      };

      // Store metadata only (no base64 data to avoid quote issues)
      sessionStorage.setItem(
        "leaseAgreementMetadata",
        JSON.stringify(fileMetadata)
      );

      // Store the actual file globally so it can be accessed by billing page
      (window as any).leaseAgreementFileBuffer = data.leaseAgreement;

      console.log("Lease agreement file metadata stored in sessionStorage");

      // Remove the File object from data to avoid serialization issues
      delete (data as any).leaseAgreement;
    }

    // Handle ID verification upload file - store only metadata to avoid quota issues
    if (data.idVerificationUpload) {
      console.log("ID verification file", data.idVerificationUpload);

      // Store only metadata in sessionStorage, store the actual file globally
      const fileMetadata = {
        name: data.idVerificationUpload.name,
        type: data.idVerificationUpload.type,
        size: data.idVerificationUpload.size,
        uploaded: true,
      };

      // Store metadata only (no base64 data to avoid quota issues)
      sessionStorage.setItem(
        "idVerificationUploadMetadata",
        JSON.stringify(fileMetadata)
      );

      // Store the actual file globally so it can be accessed by billing page
      (window as any).idVerificationFileBuffer = data.idVerificationUpload;

      console.log("ID verification file metadata stored in sessionStorage");

      // Remove the File object from data to avoid serialization issues
      delete (data as any).idVerificationUpload;
    }

    // Store user data and navigate to billing preview
    localStorage.setItem("registrationUserData", JSON.stringify(data));
    navigate("/register/billing");
  };

  // Handler for password validation
  const handlePasswordChange = (value: string) => {
    setPasswordValidation({
      length: value.length >= 8,
      uppercase: /[A-Z]/.test(value),
      lowercase: /[a-z]/.test(value),
      number: /\d/.test(value),
      specialChar: /[!@#$%^&*(),.?":{}|<>]/.test(value),
    });
  };

  const showMonthlyRent =
    form.watch("ownership") === "tenant" ||
    form.watch("ownership") === "landlord" ||
    form.watch("ownership") === "home_owner";
  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      const file = files[0];

      if (file) {
        console.log("file", file);
        form.setValue("leaseAgreement", file);
      }
    },
    [form]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        console.log("file", file);
        form.setValue("leaseAgreement", file);
      }
    },
    [form]
  );

  const removeFile = useCallback(() => {
    form.setValue("leaseAgreement", undefined as any);
  }, [form]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-primary-50 dark:from-slate-900 dark:to-slate-800 py-8">
      <div className="container-padded">
        <div className="max-w-5xl mx-auto">
          {/* Logo */}
          <div className="text-center mb-8">
            <img src={logo} alt="Rented123 Logo" className="h-20 mx-auto" />
          </div>

          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-8 mb-4">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 bg-secondary text-white rounded-full flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <span className="text-sm font-medium text-secondary">
                  User Information
                </span>
              </div>
              <div className="w-12 h-0.5 bg-slate-300 dark:bg-slate-600"></div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 bg-slate-300 dark:bg-slate-600 text-slate-600 dark:text-slate-400 rounded-full flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Billing & Plan
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-soft p-8 border dark:border-slate-700">
            {/* ID Verification Banner */}
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl">
              <div className="flex items-center gap-3">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-blue-800 dark:text-blue-300 mb-1">
                    ID Verification Required
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-400">
                    Please complete your ID verification{" "}
                    <a
                      href="https://www.rented123.com/id-verification"
                      target="_blank"
                      className="text-blue-700 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300"
                    >
                      here
                    </a>{" "}
                    before proceeding. If you've already done this, please
                    continue below.
                  </p>
                </div>
              </div>
            </div>

            <div className="text-center mb-8">
              <h1 className="text-2xl font-semibold text-primary-800 dark:text-primary-300 mb-2">
                Create Your Account
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Let's start with your basic information
              </p>
            </div>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-8"
              >
                {/* Personal Information Section */}
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-600 pb-2">
                    Personal Information
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter your first name"
                              {...field}
                              className={cn(
                                form.formState.errors.firstName &&
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
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter your last name"
                              {...field}
                              className={cn(
                                form.formState.errors.lastName &&
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
                      name="middleName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Middle Name{" "}
                            <span className="text-slate-400">(optional)</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter your middle name"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="birthdate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Birth Date</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                              className={cn(
                                form.formState.errors.birthdate &&
                                  "border-red-500 focus-visible:ring-red-500"
                              )}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Contact Information Section */}
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-600 pb-2">
                    Contact Information
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Choose a username"
                              {...field}
                              className={cn(
                                form.formState.errors.username &&
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
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="Enter your email"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                setEmailValue(e.target.value);
                                // Reset check when user types
                                setShouldCheckId(false);
                              }}
                              onBlur={() => {
                                // Only check if email looks valid
                                if (emailValue && emailValue.includes("@")) {
                                  setShouldCheckId(true);
                                }
                              }}
                              className={cn(
                                form.formState.errors.email &&
                                  "border-red-500 focus-visible:ring-red-500"
                              )}
                            />
                          </FormControl>
                          <FormMessage />

                          {/* ID Verification Status */}
                          {emailValue && (
                            <div className="mt-2">
                              {isCheckingId ? (
                                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Checking ID verification...
                                </div>
                              ) : idVerificationData?.status === "found" ? (
                                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                                  <CheckCircle2 className="w-4 h-4" />
                                  ID verification report found
                                </div>
                              ) : idVerificationData?.status === "not_found" ? (
                                <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                                  <XCircle className="w-4 h-4" />
                                  {idVerificationData.message}
                                </div>
                              ) : idVerificationData?.status === "error" ? (
                                <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
                                  <AlertTriangle className="w-4 h-4" />
                                  {idVerificationData.message}
                                </div>
                              ) : null}
                            </div>
                          )}
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Phone Number{" "}
                            <span className="text-slate-400">(optional)</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="tel"
                              placeholder="+1 (555) 123-4567"
                              {...field}
                              className={cn(
                                form.formState.errors.phoneNumber &&
                                  "border-red-500 focus-visible:ring-red-500"
                              )}
                            />
                          </FormControl>
                          <FormDescription className="text-xs text-slate-500 dark:text-slate-400">
                            We will remind you to report your rent each month
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Address Information Section */}
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-600 pb-2">
                    Address Information
                  </h2>
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address Line 1</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Street address"
                            {...field}
                            className={cn(
                              form.formState.errors.address &&
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
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="City"
                              {...field}
                              className={cn(
                                form.formState.errors.city &&
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
                      name="province"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Province/State</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Province or State"
                              {...field}
                              className={cn(
                                form.formState.errors.province &&
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
                      name="postalCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Postal/ZIP Code</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Postal or ZIP code"
                              {...field}
                              className={cn(
                                form.formState.errors.postalCode &&
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
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <FormControl>
                            <select
                              {...field}
                              className={cn(
                                "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-black dark:text-black ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                                form.formState.errors.country &&
                                  "border-red-500 focus-visible:ring-red-500"
                              )}
                            >
                              <option value="">Select Country</option>
                              <option value="Canada">Canada</option>
                              <option value="United States">
                                United States
                              </option>
                              <option value="Mexico">Mexico</option>

                              <option value="United Kingdom">
                                United Kingdom
                              </option>
                              <option value="Australia">Australia</option>
                              <option value="Germany">Germany</option>
                              <option value="France">France</option>
                              <option value="France">France</option>

                              <option value="Other">Other</option>
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Account Security Section */}
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-600 pb-2">
                      Account Security
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type={showPassword ? "text" : "password"}
                                  placeholder="Create a password"
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(e);
                                    handlePasswordChange(e.target.value);
                                  }}
                                  className={cn(
                                    "pr-10",
                                    form.formState.errors.password &&
                                      "border-red-500 focus-visible:ring-red-500"
                                  )}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                >
                                  {showPassword ? (
                                    <EyeOff className="w-4 h-4" />
                                  ) : (
                                    <Eye className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type={
                                    showConfirmPassword ? "text" : "password"
                                  }
                                  placeholder="Confirm your password"
                                  {...field}
                                  className={cn(
                                    "pr-10",
                                    form.formState.errors.confirmPassword &&
                                      "border-red-500 focus-visible:ring-red-500"
                                  )}
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    setShowConfirmPassword(!showConfirmPassword)
                                  }
                                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                >
                                  {showConfirmPassword ? (
                                    <EyeOff className="w-4 h-4" />
                                  ) : (
                                    <Eye className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Password Requirements */}
                    {form.watch("password") && (
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1">
                        <PasswordRequirement
                          isValid={passwordValidation.length}
                        >
                          At least 8 characters
                        </PasswordRequirement>
                        <PasswordRequirement
                          isValid={passwordValidation.uppercase}
                        >
                          1 uppercase letter
                        </PasswordRequirement>
                        <PasswordRequirement
                          isValid={passwordValidation.lowercase}
                        >
                          1 lowercase letter
                        </PasswordRequirement>
                        <PasswordRequirement
                          isValid={passwordValidation.number}
                        >
                          1 number
                        </PasswordRequirement>
                        <PasswordRequirement
                          isValid={passwordValidation.specialChar}
                        >
                          1 special character
                        </PasswordRequirement>
                        <PasswordRequirement
                          isValid={
                            form.watch("password") ===
                              form.watch("confirmPassword") &&
                            form.watch("confirmPassword") !== ""
                          }
                        >
                          Passwords match
                        </PasswordRequirement>
                      </div>
                    )}

                    {/* ID Verification Upload - dynamically shows/hides based on email verification status */}
                    {idVerificationData?.status === "not_found" && (
                      <div className="space-y-2">
                        <FormLabel>ID Verification Report (PDF)</FormLabel>
                        <div
                          className={cn(
                            "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
                            isIdDragOver
                              ? "border-gray-400 bg-gray-50 dark:bg-slate-800/40"
                              : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                          )}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsIdDragOver(true);
                          }}
                          onDragLeave={(e) => {
                            e.preventDefault();
                            setIsIdDragOver(false);
                          }}
                          onDrop={async (e) => {
                            e.preventDefault();
                            setIsIdDragOver(false);
                            const file = e.dataTransfer.files?.[0];
                            if (file) {
                              await validateIdVerificationUpload(file);
                            }
                          }}
                        >
                          <input
                            type="file"
                            accept=".pdf"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                await validateIdVerificationUpload(file);
                              }
                            }}
                            className="hidden"
                            id="id-verification-upload"
                          />
                          {form.watch("idVerificationUpload") ? (
                            <div className="flex items-center justify-center gap-3">
                              <FileText className="w-8 h-8 text-green-600" />
                              <div className="text-left">
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  {form.watch("idVerificationUpload")?.name}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  form.setValue(
                                    "idVerificationUpload",
                                    undefined as any
                                  )
                                }
                                className="ml-2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                              >
                                <X className="w-4 h-4 text-gray-500" />
                              </button>
                            </div>
                          ) : (
                            <label
                              htmlFor="id-verification-upload"
                              className="cursor-pointer flex flex-col items-center gap-2"
                            >
                              <Upload className="w-8 h-8 text-gray-400" />
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                Drag and drop your ID verification PDF here, or{" "}
                                <span className="text-blue-600 hover:text-blue-500">
                                  browse files
                                </span>
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Accepts PDF • Maximum 10MB
                              </p>
                            </label>
                          )}
                        </div>

                        {/* Upload Status */}
                        {idVerificationUploadStatus.isVerifying && (
                          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mt-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Verifying document...
                          </div>
                        )}

                        {idVerificationUploadStatus.isValid === true && (
                          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 mt-2">
                            <CheckCircle2 className="w-4 h-4" />
                            Valid ID verification document
                          </div>
                        )}

                        {idVerificationUploadStatus.isValid === false && (
                          <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 mt-2">
                            <XCircle className="w-4 h-4" />
                            {idVerificationUploadStatus.message}
                          </div>
                        )}

                        {/* Optional: Link to complete new verification */}
                        <div className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                          Don’t have the PDF?{" "}
                          <button
                            type="button"
                            className="underline"
                            onClick={() =>
                              window.open(
                                "https://www.rented123.com/id-verification",
                                "_blank"
                              )
                            }
                          >
                            Complete new verification
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Rental Information Section */}
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-600 pb-2">
                      Rental Information
                    </h2>

                    {/* Lease Agreement Upload */}
                    <FormField
                      control={form.control}
                      name="leaseAgreement"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lease Agreement</FormLabel>
                          <FormControl>
                            <div
                              className={cn(
                                "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
                                isDragOver
                                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                  : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500",
                                form.formState.errors.leaseAgreement &&
                                  "border-red-500 focus-visible:ring-red-500"
                              )}
                              onDragOver={handleDragOver}
                              onDragLeave={handleDragLeave}
                              onDrop={handleDrop}
                            >
                              {field.value ? (
                                <div className="flex items-center justify-center gap-3">
                                  <FileText className="w-8 h-8 text-green-600" />
                                  <div className="text-left">
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                      {field.value.name}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {(
                                        field.value.size /
                                        (1024 * 1024)
                                      ).toFixed(2)}{" "}
                                      MB
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={removeFile}
                                    className="ml-2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                                  >
                                    <X className="w-4 h-4 text-gray-500" />
                                  </button>
                                </div>
                              ) : (
                                <div>
                                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                    Drag and drop your lease agreement here, or{" "}
                                    <label className="text-blue-600 hover:text-blue-500 cursor-pointer">
                                      browse files
                                      <input
                                        type="file"
                                        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                      />
                                    </label>
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Accepts PDF, DOC, DOCX, PNG, JPG, JPEG, WEBP
                                    • Maximum 10MB
                                  </p>
                                </div>
                              )}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="ownership"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>I am a...</FormLabel>
                            <FormControl>
                              <div className="space-y-2">
                                {[
                                  { value: "tenant", label: "Tenant" },
                                  { value: "landlord", label: "Landlord" },
                                  { value: "home_owner", label: "Home Owner" },
                                  {
                                    value: "property_manager",
                                    label: "Property Manager",
                                  },
                                ].map((option) => (
                                  <label
                                    key={option.value}
                                    className="flex items-center gap-2"
                                  >
                                    <input
                                      type="radio"
                                      {...field}
                                      value={option.value}
                                      checked={field.value === option.value}
                                      className="text-secondary focus:ring-secondary-300"
                                    />
                                    <span className="text-sm dark:text-slate-300">
                                      {option.label}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {showMonthlyRent && (
                        <FormField
                          control={form.control}
                          name="monthlyRent"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                {form.watch("ownership") === "home_owner"
                                  ? "Monthly Mortgage"
                                  : "Monthly Rent"}
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="1200"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Terms and Privacy Policy Checkboxes */}
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="termsAndConditions"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-sm font-normal">
                            I agree to the{" "}
                            <a
                              href="https://rented123.com/wp-content/uploads/2024/11/Disclosure-of-Referral-Fees-and-Commission.pdf"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary-600 hover:text-primary-700 underline"
                            >
                              Terms and Conditions
                            </a>
                          </FormLabel>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="privacyPolicy"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-sm font-normal">
                            I agree to the{" "}
                            <a
                              href="https://rented123.com/privacy-policy/"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary-600 hover:text-primary-700 underline"
                            >
                              Privacy Policy
                            </a>{" "}
                            and{" "}
                            <a
                              href="https://rented123.com/wp-content/uploads/2025/01/Rented123.com-fees-and-compensation-Anti-spam-acknowledgement-.docx.pdf"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary-600 hover:text-primary-700 underline"
                            >
                              Disclosure of Referral Fees and Commission
                            </a>
                          </FormLabel>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-secondary text-white rounded-xl py-3 font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  Continue to Billing
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Already have an account?{" "}
                <a href="/login" className="text-secondary hover:underline">
                  Sign in
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
