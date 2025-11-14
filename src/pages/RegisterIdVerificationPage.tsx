import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  XCircle,
} from "lucide-react";
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
import { useIdVerification } from "../lib/hooks/useIdVerification";
import { cn } from "../lib/utils";
import logo from "../assets/logo.png";

const emailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type EmailForm = z.infer<typeof emailSchema>;

export default function RegisterIdVerificationPage() {
  const navigate = useNavigate();
  const [emailValue, setEmailValue] = useState("");
  const [shouldCheckId, setShouldCheckId] = useState(false);

  const form = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const { data: idVerificationData, isLoading: isCheckingId } =
    useIdVerification(emailValue, shouldCheckId);

  const onSubmit = () => {
    // If verified, allow navigation to register form
    if (idVerificationData?.status === "found") {
      navigate("/register");
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-primary-50 dark:from-slate-900 dark:to-slate-800 py-8">
      <div className="container-padded">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <img src={logo} alt="Rented123 Logo" className="h-20 mx-auto" />
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-soft p-8 md:p-10 border dark:border-slate-700">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                Verify Your Identity
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Enter the email you used for ID verification to continue.
              </p>
            </div>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="you@example.com"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            const v = e.target.value;
                            setEmailValue(v);
                            setShouldCheckId(
                              !!(v && v.includes("@") && v.length > 5)
                            );
                          }}
                          className={cn(
                            "h-12",
                            form.formState.errors.email &&
                              "border-red-500 focus-visible:ring-red-500"
                          )}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {emailValue && emailValue.includes("@") && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    {isCheckingId ? (
                      <div className="relative overflow-hidden flex items-center gap-4 p-5 bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 dark:from-blue-900/30 dark:via-indigo-900/30 dark:to-blue-900/30 border-2 border-blue-200/60 dark:border-blue-700/60 rounded-xl shadow-md">
                        <div className="relative flex-shrink-0">
                          <div className="absolute inset-0 bg-blue-400/20 rounded-full animate-ping"></div>
                          <div className="relative w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                            <Loader2 className="w-6 h-6 animate-spin text-white" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-base text-slate-900 dark:text-slate-100">
                            Checking ID Verification
                          </p>
                        </div>
                      </div>
                    ) : idVerificationData?.status === "found" ? (
                      <div className="relative overflow-hidden flex items-center gap-4 p-3 bg-gradient-to-r from-emerald-50 via-green-50 to-emerald-50 dark:from-emerald-900/25 dark:via-green-900/25 dark:to-emerald-900/25 border-2 border-emerald-300/60 dark:border-emerald-700/60 rounded-xl shadow-lg">
                        <div className="relative flex-shrink-0">
                          <div className="relative w-5 h-5 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center shadow">
                            <CheckCircle2 className="w-4 h-4 text-white" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-emerald-900 dark:text-emerald-100">
                            Identity Verified
                          </p>
                        </div>
                      </div>
                    ) : idVerificationData?.status === "not_found" ? (
                      <div className="relative overflow-hidden flex items-start">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-red-900 dark:text-rose-100">
                            ID Verification Not Found. Click below to start
                            verification.
                          </p>
                        </div>
                      </div>
                    ) : idVerificationData?.status === "error" ? (
                      <div className="relative overflow-hidden flex items-center gap-4 p-4 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 dark:from-amber-900/25 dark:via-orange-900/25 dark:to-amber-900/25 border-2 border-amber-200/60 dark:border-amber-700/60 rounded-xl shadow">
                        <div className="relative flex-shrink-0">
                          <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center shadow">
                            <AlertTriangle className="w-4 h-4 text-white" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-amber-900 dark:text-amber-100">
                            Verification Error
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={
                    isCheckingId || idVerificationData?.status !== "found"
                  }
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 font-medium disabled:opacity-50"
                >
                  Continue to Registration
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <div className="text-center">
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                    or{" "}
                  </p>
                  <Button
                    type="button"
                    onClick={() => navigate(`/id-verification/purchase`)}
                    className="w-full bg-white border-blue-600 border hover:bg-blue-600 text-blue-600 hover:text-white rounded-xl py-3 font-medium disabled:opacity-50"
                  >
                    Start Verification
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </main>
  );
}
