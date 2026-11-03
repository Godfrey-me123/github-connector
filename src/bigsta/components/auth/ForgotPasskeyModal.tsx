import React, { useEffect, useState } from "react";
import { AlertCircle, ArrowRight, CheckCircle2, Mail, Shield, X } from "lucide-react";
import { useTemplateStore } from "../../store/useTemplateStore";

interface ForgotPasskeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const ForgotPasskeyModal: React.FC<ForgotPasskeyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { requestPasswordReset } = useTemplateStore();
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setErrorMessage("Enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await requestPasswordReset(email.trim());
      if (!result.success) {
        setErrorMessage(result.message);
        return;
      }
      setSuccessMessage(result.message);
      onSuccess(result.message);
    } catch {
      setErrorMessage("We couldn’t send a reset email right now. Please try again shortly.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="reset-password-title"
        onClick={(event) => event.stopPropagation()}
        className="flex w-full max-w-md cursor-default flex-col overflow-hidden rounded-2xl border border-white/20 bg-[#1C2541] shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-blue-900 to-[#1C2541] p-5">
          <div className="flex items-center gap-3">
            <span className="rounded-xl border border-[#47A5FF]/40 bg-[#47A5FF]/20 p-2.5 text-[#47A5FF]">
              <Shield className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 id="reset-password-title" className="text-lg font-extrabold tracking-tight text-white">
                Reset password
              </h2>
              <p className="text-xs text-slate-300">We’ll email you a secure reset link.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close password reset"
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div className="space-y-1.5">
            <label htmlFor="reset-email" className="block text-xs font-bold uppercase tracking-wider text-slate-200">
              Email address
            </label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3.5 h-4 w-4 text-slate-400" aria-hidden="true" />
              <input
                id="reset-email"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (errorMessage) setErrorMessage("");
                }}
                placeholder="you@example.com"
                autoComplete="email"
                required
                className="w-full rounded-xl border border-white/15 bg-[#0B132B] py-3 pl-10 pr-4 text-sm text-white outline-none transition-all placeholder:text-slate-500 focus:border-[#47A5FF] focus:ring-2 focus:ring-[#47A5FF]/20"
              />
            </div>
          </div>

          {errorMessage && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/15 p-3 text-xs text-red-200" role="alert">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" aria-hidden="true" />
              <span className="font-medium leading-tight">{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/15 p-3 text-xs text-emerald-200" role="status" aria-live="polite">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
              <span className="font-medium leading-tight">{successMessage}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-gradient-to-r from-[#47A5FF] to-blue-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-500 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Sending reset link…" : "Send reset link"}
            {!isSubmitting && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
          </button>
        </form>
      </section>
    </div>
  );
};
