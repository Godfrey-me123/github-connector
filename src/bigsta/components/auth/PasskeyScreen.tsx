import React, { useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  HelpCircle,
  LockKeyhole,
  Mail,
  Shield,
  UserPlus,
} from "lucide-react";
import { useTemplateStore } from "../../store/useTemplateStore";
import { UserRegistrationModal } from "./UserRegistrationModal";
import { ForgotPasskeyModal } from "./ForgotPasskeyModal";

export const PasskeyScreen: React.FC = () => {
  const { loginWithEmailPassword } = useTemplateStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successNotice, setSuccessNotice] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isForgotOpen, setIsForgotOpen] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage("Enter your email and password to continue.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    setSuccessNotice("");

    try {
      const result = await loginWithEmailPassword(email, password);
      if (!result.success) setErrorMessage(result.message || "Sign-in failed.");
    } catch {
      setErrorMessage("Sign-in is temporarily unavailable. Please try again shortly.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-y-auto bg-[#0B132B] px-4 py-8 font-sans text-white sm:py-12">
      <div className="pointer-events-none absolute left-1/2 top-1/4 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#47A5FF]/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-10 right-10 h-80 w-80 rounded-full bg-blue-600/10 blur-3xl" />

      <section className="relative z-10 my-auto flex w-full max-w-md flex-col items-center rounded-2xl border border-white/10 bg-[#1C2541]/90 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 rounded-2xl border border-[#47A5FF]/30 bg-[#47A5FF]/10 p-3 text-[#47A5FF]">
            <Shield className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">BIGsta</h1>
          <p className="mt-2 text-sm text-slate-300">Sign in to your account</p>
        </div>

        {successNotice && (
          <div
            className="mb-4 flex w-full items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/15 p-3.5 text-xs text-emerald-200"
            role="status"
            aria-live="polite"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
            <span className="font-medium leading-relaxed">{successNotice}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="signin-email" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Email address
            </label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3.5 h-4 w-4 text-slate-400" aria-hidden="true" />
              <input
                id="signin-email"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (errorMessage) setErrorMessage("");
                }}
                placeholder="you@example.com"
                autoComplete="username"
                required
                className="w-full rounded-xl border border-white/15 bg-[#0B132B]/80 py-3 pl-10 pr-4 text-sm text-white outline-none transition-all placeholder:text-slate-500 focus:border-[#47A5FF] focus:ring-2 focus:ring-[#47A5FF]/20"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="signin-password" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Password
            </label>
            <div className="relative flex items-center">
              <LockKeyhole className="absolute left-3.5 h-4 w-4 text-slate-400" aria-hidden="true" />
              <input
                id="signin-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (errorMessage) setErrorMessage("");
                }}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
                className="w-full rounded-xl border border-white/15 bg-[#0B132B]/80 py-3 pl-10 pr-11 text-sm text-white outline-none transition-all placeholder:text-slate-500 focus:border-[#47A5FF] focus:ring-2 focus:ring-[#47A5FF]/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                className="absolute right-3.5 rounded p-1 text-slate-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#47A5FF]"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/15 p-3 text-xs text-red-200" role="alert">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" aria-hidden="true" />
              <span className="font-medium leading-tight">{errorMessage}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-gradient-to-r from-[#47A5FF] to-blue-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-500 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "Signing in…" : "Sign in"}
            {!isLoading && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
          </button>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => setIsForgotOpen(true)}
              disabled={isLoading}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#47A5FF] hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            >
              <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
              Forgot password?
            </button>
          </div>
        </form>

        <div className="mt-6 flex w-full flex-col items-center gap-2.5 border-t border-white/10 pt-4">
          <p className="text-xs font-medium text-slate-300">New to BIGsta?</p>
          <button
            type="button"
            onClick={() => setIsRegisterOpen(true)}
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#47A5FF]/30 bg-white/5 px-4 py-2.5 text-xs font-bold text-[#47A5FF] transition-all hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
          >
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Create account
          </button>
        </div>
      </section>

      <UserRegistrationModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onSuccess={(message) => setSuccessNotice(message)}
      />

      <ForgotPasskeyModal
        isOpen={isForgotOpen}
        onClose={() => setIsForgotOpen(false)}
        onSuccess={(message) => setSuccessNotice(message)}
      />
    </main>
  );
};
