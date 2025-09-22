import { useState, useEffect } from "react";
import ProtectedRoute from "../components/ProtectedRoute";
import AppLayout from "../components/AppLayout";
import Card from "../components/Card";
import ConfirmationDialog from "../components/ConfirmationDialogBox";
import { Toast } from "../components/ui/toast";
import { updatePassword, deleteUser } from "aws-amplify/auth";
import { Loader2, Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react";
import { Skeleton, SkeletonText, SkeletonButton } from "../components/Skeleton";
import {
  useUserAttributes,
  useUpdateUserAttributes,
} from "../lib/hooks/useUserAttributes";
import { formatPhoneToE164 } from "../lib/utils";

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

export default function AccountPage() {
  const { data: userAttributes = {}, isLoading } = useUserAttributes();
  const updateUserAttributesMutation = useUpdateUserAttributes();

  // State for different parts of the page
  const [profileForm, setProfileForm] = useState({
    given_name: "",
    family_name: "",
    phone_number: " ",
    address: "",
    birthdate: "",
    preferred_username: "",
    "custom:address_2": "",
    "custom:city": "",
    "custom:province": "",
    "custom:country": "",
    "custom:postal_code": "",
    "custom:MonthlyRent": "",
    "custom:ownership-title": "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // State for loading and messages
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{
    isVisible: boolean;
    type: "success" | "error";
    message: string;
  }>({
    isVisible: false,
    type: "success",
    message: "",
  });

  // State for password visibility and validation
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    specialChar: false,
  });

  // State for controlling the delete confirmation dialog
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // Update profile form when user attributes are loaded
  useEffect(() => {
    if (userAttributes && Object.keys(userAttributes).length > 0) {
      const customAttributes = userAttributes as any;
      setProfileForm({
        given_name: userAttributes.given_name || "",
        family_name: userAttributes.family_name || "",
        phone_number: userAttributes.phone_number || "",
        address: userAttributes.address || "",
        birthdate: userAttributes.birthdate || "",
        preferred_username: userAttributes.preferred_username || "",
        "custom:address_2": customAttributes["custom:address_2"] || "",
        "custom:city": customAttributes["custom:city"] || "",
        "custom:province": customAttributes["custom:province"] || "",
        "custom:country": customAttributes["custom:country"] || "",
        "custom:postal_code": customAttributes["custom:postal_code"] || "",
        "custom:MonthlyRent": customAttributes["custom:MonthlyRent"] || "",
        "custom:ownership-title":
          customAttributes["custom:ownership-title"] || "",
      });
    }
  }, [userAttributes]);

  // Function to show toast
  const showToast = (type: "success" | "error", message: string) => {
    setToast({
      isVisible: true,
      type,
      message,
    });
  };

  const hideToast = () => {
    setToast((prev) => ({ ...prev, isVisible: false }));
  };

  // Handlers for form input changes
  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setProfileForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));

    // Real-time validation for the new password field
    if (name === "newPassword") {
      setPasswordValidation({
        length: value.length >= 8,
        uppercase: /[A-Z]/.test(value),
        lowercase: /[a-z]/.test(value),
        number: /\d/.test(value),
        specialChar: /[!@#$%^&*(),.?":{}|<>]/.test(value),
      });
    }
  };

  // Handler for submitting profile updates
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProfileSaving(true);
    try {
      // Format phone number to E.164 format if provided, otherwise use space for Cognito
      const formattedPhoneNumber =
        profileForm.phone_number && profileForm.phone_number.trim()
          ? formatPhoneToE164(profileForm.phone_number)
          : " "; // Use space if empty to satisfy Cognito requirement

      const attributesToUpdate: any = {
        given_name: profileForm.given_name,
        family_name: profileForm.family_name,
        phone_number: formattedPhoneNumber,
        address: profileForm.address,
        birthdate: profileForm.birthdate,
        preferred_username: profileForm.preferred_username,
        "custom:address_2": profileForm["custom:address_2"],
        "custom:city": profileForm["custom:city"],
        "custom:province": profileForm["custom:province"],
        "custom:country": profileForm["custom:country"],
        "custom:postal_code": profileForm["custom:postal_code"],
        "custom:MonthlyRent": profileForm["custom:MonthlyRent"],
        "custom:ownership-title": profileForm["custom:ownership-title"],
      };
      await updateUserAttributesMutation.mutateAsync(attributesToUpdate);
      showToast("success", "Your changes are saved.");
    } catch (error: any) {
      showToast("error", error.message || "Failed to update profile.");
    } finally {
      setIsProfileSaving(false);
    }
  };

  // Handler for submitting password changes
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPasswordFormInvalid) return;
    setIsPasswordSaving(true);
    try {
      await updatePassword({
        oldPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      showToast("success", "Password updated successfully!");
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      showToast("error", error.message || "Failed to update password.");
    } finally {
      setIsPasswordSaving(false);
    }
  };

  // Check if the profile form has been changed
  const customAttributes = userAttributes as any;
  const isProfileUnchanged =
    (userAttributes.given_name || "") === profileForm.given_name &&
    (userAttributes.family_name || "") === profileForm.family_name &&
    (userAttributes.phone_number || "") === profileForm.phone_number &&
    (userAttributes.address || "") === profileForm.address &&
    (userAttributes.birthdate || "") === profileForm.birthdate &&
    (userAttributes.preferred_username || "") ===
      profileForm.preferred_username &&
    (customAttributes["custom:address_2"] || "") ===
      profileForm["custom:address_2"] &&
    (customAttributes["custom:city"] || "") === profileForm["custom:city"] &&
    (customAttributes["custom:province"] || "") ===
      profileForm["custom:province"] &&
    (customAttributes["custom:country"] || "") ===
      profileForm["custom:country"] &&
    (customAttributes["custom:postal_code"] || "") ===
      profileForm["custom:postal_code"] &&
    (customAttributes["custom:MonthlyRent"] || "") ===
      profileForm["custom:MonthlyRent"] &&
    (customAttributes["custom:ownership-title"] || "") ===
      profileForm["custom:ownership-title"];

  // Check if the password form is valid for submission
  const isPasswordFormInvalid =
    !passwordForm.currentPassword ||
    !passwordForm.newPassword ||
    Object.values(passwordValidation).some((v) => !v) ||
    passwordForm.newPassword !== passwordForm.confirmPassword;

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      // This is the Amplify function to delete the currently signed-in user
      await deleteUser();
      // On success, you would typically redirect the user to a "goodbye" page or the homepage
      // For now, we'll just log it and close the modal.
      console.log("User account deleted successfully.");
      setIsDeleteModalOpen(false);
      // navigate('/goodbye'); // Example redirect
    } catch (error: any) {
      console.error("Error deleting account:", error);
      setDeleteError(error.message || "Failed to delete account.");
      // The error will be displayed inside the modal or on the page
    } finally {
      setIsDeleting(false);
    }
  };
  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6 max-w-7xl mx-auto">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Profile Information">
              <div className="space-y-4">
                <SkeletonText lines={8} />
                <SkeletonButton />
              </div>
            </Card>
            <Card title="Change Password">
              <div className="space-y-4">
                <SkeletonText lines={6} />
                <SkeletonButton />
              </div>
            </Card>
          </div>
          <Card title="Danger Zone">
            <div className="border border-red-500/30 rounded-xl p-4 flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-64" />
              </div>
              <SkeletonButton />
            </div>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <ProtectedRoute requireSubscription={false}>
      <AppLayout>
        <Toast
          isVisible={toast.isVisible}
          type={toast.type}
          message={toast.message}
          onClose={hideToast}
        />
        <ConfirmationDialog
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDeleteAccount}
          title="Delete Account"
          message="Are you sure you want to permanently delete your account? All of your data, including uploaded documents, will be removed. This action cannot be undone."
          confirmButtonText="Yes, Delete My Account"
          isLoading={isDeleting}
        />
        <div className="space-y-8 max-w-7xl mx-auto">
          <div>
            <h1 className="text-2xl font-bold text-brand dark:text-primary-300 mb-2">
              Account Settings
            </h1>
            <p className="text-base text-slate-600 dark:text-slate-400 font-medium">
              Manage your profile and security preferences
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Profile Information">
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="text-sm font-medium block mb-1 dark:text-slate-300"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={userAttributes.email || ""}
                    readOnly
                    disabled
                    className="w-full rounded-xl border dark:border-slate-600 px-3 py-2 bg-slate-100 dark:bg-slate-700/50 dark:text-slate-400 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label
                    htmlFor="preferred_username"
                    className="text-sm font-medium block mb-1 dark:text-slate-300"
                  >
                    Username
                  </label>
                  <input
                    id="preferred_username"
                    name="preferred_username"
                    value={profileForm.preferred_username}
                    onChange={handleProfileChange}
                    className="w-full rounded-xl border dark:border-slate-600 px-3 py-2 outline-none focus:ring-2 focus:ring-secondary-300 bg-white dark:bg-slate-700 dark:text-white"
                  />
                </div>
                <div>
                  <label
                    htmlFor="given_name"
                    className="text-sm font-medium block mb-1 dark:text-slate-300"
                  >
                    First Name
                  </label>
                  <input
                    id="given_name"
                    name="given_name"
                    value={profileForm.given_name}
                    onChange={handleProfileChange}
                    className="w-full rounded-xl border dark:border-slate-600 px-3 py-2 outline-none focus:ring-2 focus:ring-secondary-300 bg-white dark:bg-slate-700 dark:text-white"
                  />
                </div>
                <div>
                  <label
                    htmlFor="family_name"
                    className="text-sm font-medium block mb-1 dark:text-slate-300"
                  >
                    Last Name
                  </label>
                  <input
                    id="family_name"
                    name="family_name"
                    value={profileForm.family_name}
                    onChange={handleProfileChange}
                    className="w-full rounded-xl border dark:border-slate-600 px-3 py-2 outline-none focus:ring-2 focus:ring-secondary-300 bg-white dark:bg-slate-700 dark:text-white"
                  />
                </div>
                <div>
                  <label
                    htmlFor="phone_number"
                    className="text-sm font-medium block mb-1 dark:text-slate-300"
                  >
                    Phone
                  </label>
                  <input
                    id="phone_number"
                    name="phone_number"
                    value={profileForm.phone_number}
                    onChange={handleProfileChange}
                    className="w-full rounded-xl border dark:border-slate-600 px-3 py-2 outline-none focus:ring-2 focus:ring-secondary-300 bg-white dark:bg-slate-700 dark:text-white"
                  />
                </div>
                <div>
                  <label
                    htmlFor="address"
                    className="text-sm font-medium block mb-1 dark:text-slate-300"
                  >
                    Address
                  </label>
                  <input
                    id="address"
                    name="address"
                    value={profileForm.address}
                    onChange={handleProfileChange}
                    className="w-full rounded-xl border dark:border-slate-600 px-3 py-2 outline-none focus:ring-2 focus:ring-secondary-300 bg-white dark:bg-slate-700 dark:text-white"
                  />
                </div>
                <div>
                  <label
                    htmlFor="birthdate"
                    className="text-sm font-medium block mb-1 dark:text-slate-300"
                  >
                    Birthdate
                  </label>
                  <input
                    id="birthdate"
                    name="birthdate"
                    type="date"
                    value={profileForm.birthdate}
                    onChange={handleProfileChange}
                    className="w-full rounded-xl border dark:border-slate-600 px-3 py-2 outline-none focus:ring-2 focus:ring-secondary-300 bg-white dark:bg-slate-700 dark:text-white"
                  />
                </div>

                {/* Custom Fields Section */}
                <div className="border-t border-slate-200 dark:border-slate-600 pt-4 mt-6 space-y-4">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
                    Additional Information
                  </h3>

                  <div>
                    <label
                      htmlFor="custom:address_2"
                      className="text-sm font-medium block mb-1 dark:text-slate-300"
                    >
                      Address Line 2
                    </label>
                    <input
                      id="custom:address_2"
                      name="custom:address_2"
                      value={profileForm["custom:address_2"]}
                      onChange={handleProfileChange}
                      className="w-full rounded-xl border dark:border-slate-600 px-3 py-2 outline-none focus:ring-2 focus:ring-secondary-300 bg-white dark:bg-slate-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="custom:city"
                      className="text-sm font-medium block mb-1 dark:text-slate-300"
                    >
                      City
                    </label>
                    <input
                      id="custom:city"
                      name="custom:city"
                      value={profileForm["custom:city"]}
                      onChange={handleProfileChange}
                      className="w-full rounded-xl border dark:border-slate-600 px-3 py-2 outline-none focus:ring-2 focus:ring-secondary-300 bg-white dark:bg-slate-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="custom:province"
                      className="text-sm font-medium block mb-1 dark:text-slate-300"
                    >
                      Province/State
                    </label>
                    <input
                      id="custom:province"
                      name="custom:province"
                      value={profileForm["custom:province"]}
                      onChange={handleProfileChange}
                      className="w-full rounded-xl border dark:border-slate-600 px-3 py-2 outline-none focus:ring-2 focus:ring-secondary-300 bg-white dark:bg-slate-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="custom:country"
                      className="text-sm font-medium block mb-1 dark:text-slate-300"
                    >
                      Country
                    </label>
                    <input
                      id="custom:country"
                      name="custom:country"
                      value={profileForm["custom:country"]}
                      onChange={handleProfileChange}
                      className="w-full rounded-xl border dark:border-slate-600 px-3 py-2 outline-none focus:ring-2 focus:ring-secondary-300 bg-white dark:bg-slate-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="custom:postal_code"
                      className="text-sm font-medium block mb-1 dark:text-slate-300"
                    >
                      Postal Code
                    </label>
                    <input
                      id="custom:postal_code"
                      name="custom:postal_code"
                      value={profileForm["custom:postal_code"]}
                      onChange={handleProfileChange}
                      className="w-full rounded-xl border dark:border-slate-600 px-3 py-2 outline-none focus:ring-2 focus:ring-secondary-300 bg-white dark:bg-slate-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="custom:MonthlyRent"
                      className="text-sm font-medium block mb-1 dark:text-slate-300"
                    >
                      Monthly Rent
                    </label>
                    <input
                      id="custom:MonthlyRent"
                      name="custom:MonthlyRent"
                      type="number"
                      step="0.01"
                      value={profileForm["custom:MonthlyRent"]}
                      onChange={handleProfileChange}
                      className="w-full rounded-xl border dark:border-slate-600 px-3 py-2 outline-none focus:ring-2 focus:ring-secondary-300 bg-white dark:bg-slate-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="custom:ownership-title"
                      className="text-sm font-medium block mb-1 dark:text-slate-300"
                    >
                      Ownership Title
                    </label>
                    <select
                      id="custom:ownership-title"
                      name="custom:ownership-title"
                      value={profileForm["custom:ownership-title"]}
                      onChange={handleSelectChange}
                      className="w-full rounded-xl border dark:border-slate-600 px-3 py-2 outline-none focus:ring-2 focus:ring-secondary-300 bg-white dark:bg-slate-700 dark:text-white"
                    >
                      <option value="">Select ownership type</option>
                      <option value="tenant">Tenant</option>
                      <option value="home_owner">Home Owner</option>
                      <option value="landlord">Landlord</option>
                      <option value="property_manager">Property Manager</option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isProfileSaving || isProfileUnchanged}
                  className="mt-3 justify-self-start bg-secondary text-white px-5 py-2 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isProfileSaving && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {isProfileSaving ? "Saving..." : "Save Changes"}
                </button>
              </form>
            </Card>

            <Card title="Change Password">
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="relative">
                  <label
                    htmlFor="currentPassword"
                    className="text-sm font-medium block mb-1 dark:text-slate-300"
                  >
                    Current Password
                  </label>
                  <input
                    id="currentPassword"
                    name="currentPassword"
                    type={showPasswords ? "text" : "password"}
                    value={passwordForm.currentPassword}
                    onChange={handlePasswordChange}
                    className="w-full rounded-xl border dark:border-slate-600 px-3 py-2 pr-10 dark:text-black"
                  />
                </div>
                <div className="relative">
                  <label
                    htmlFor="newPassword"
                    className="text-sm font-medium block mb-1 dark:text-slate-300"
                  >
                    New Password
                  </label>
                  <input
                    id="newPassword"
                    name="newPassword"
                    type={showPasswords ? "text" : "password"}
                    value={passwordForm.newPassword}
                    onChange={handlePasswordChange}
                    className="dark:text-black w-full rounded-xl border dark:border-slate-600 px-3 py-2 pr-10"
                  />
                </div>
                <div className="relative">
                  <label
                    htmlFor="confirmPassword"
                    className="text-sm font-medium block mb-1 dark:text-slate-300"
                  >
                    Confirm New Password
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPasswords ? "text" : "password"}
                    value={passwordForm.confirmPassword}
                    onChange={handlePasswordChange}
                    className="dark:text-black w-full rounded-xl border dark:border-slate-600 px-3 py-2 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(!showPasswords)}
                    className="absolute top-8 right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                    {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {passwordForm.newPassword && (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1">
                    <PasswordRequirement isValid={passwordValidation.length}>
                      At least 8 characters
                    </PasswordRequirement>
                    <PasswordRequirement isValid={passwordValidation.uppercase}>
                      1 uppercase letter
                    </PasswordRequirement>
                    <PasswordRequirement isValid={passwordValidation.lowercase}>
                      1 lowercase letter
                    </PasswordRequirement>
                    <PasswordRequirement isValid={passwordValidation.number}>
                      1 number
                    </PasswordRequirement>
                    <PasswordRequirement
                      isValid={passwordValidation.specialChar}
                    >
                      1 special character
                    </PasswordRequirement>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isPasswordSaving || isPasswordFormInvalid}
                  className="justify-self-start bg-primary-800 text-white px-5 py-2 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isPasswordSaving && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {isPasswordSaving ? "Updating..." : "Update Password"}
                </button>
              </form>
            </Card>
          </div>

          <Card title="Danger Zone">
            <div className="border border-red-500/30 rounded-xl p-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-red-700 dark:text-red-300">
                  Delete Account
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Permanently delete your account and all associated data. This
                  action cannot be undone.
                </p>
                {deleteError && (
                  <p className="text-sm text-red-500 mt-2">{deleteError}</p>
                )}
              </div>
              <button
                onClick={() => setIsDeleteModalOpen(true)}
                className="bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 transition-colors"
              >
                Delete My Account
              </button>
            </div>
          </Card>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
