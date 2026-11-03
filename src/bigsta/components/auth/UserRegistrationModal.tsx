import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Key,
  Mail,
  Phone,
  Shield,
  User,
  X,
} from "lucide-react";
import { useTemplateStore } from "../../store/useTemplateStore";

interface UserRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const UserRegistrationModal: React.FC<UserRegistrationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { registerUserAccount } = useTemplateStore();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  const validateTzPhone = (value: string) =>
    /^(?:\+255|255|0)[67]\d{8}$/.test(value.trim().replace(/\s+/g, ""));

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    if (!fullName.trim()) {
      setErrorMessage("Please enter your full name.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setErrorMessage("Enter a valid email address.");
      return;
    }
    if (!validateTzPhone(phone)) {
      setErrorMessage("Enter a valid Tanzanian phone number, such as 0712345678.");
      return;
    }
    if (password.length < 8) {
      setErrorMessage("Choose a password with at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("The passwords do not match.");
      return;
    }
    if (!acceptedTerms) {
      setErrorMessage("Please accept the Terms and Conditions to continue.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await registerUserAccount({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
      });

      if (!result.success) {
        setErrorMessage(result.message);
        return;
      }

      onSuccess(result.message);
      onClose();
    } catch {
      setErrorMessage("Registration is temporarily unavailable. Please try again shortly.");
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
        aria-labelledby="registration-title"
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-lg cursor-default flex-col overflow-hidden rounded-2xl border border-white/20 bg-[#1C2541] shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-blue-900 to-[#1C2541] p-5">
          <div className="flex items-center gap-3">
            <span className="rounded-xl border border-[#47A5FF]/40 bg-[#47A5FF]/20 p-2.5 text-[#47A5FF]">
              <Shield className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 id="registration-title" className="text-lg font-extrabold tracking-tight text-white">
                Create your account
              </h2>
              <p className="text-xs text-slate-300">Register to access BIGsta services.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close registration"
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto p-6 font-sans">
          <div className="space-y-1.5">
            <label htmlFor="register-name" className="block text-xs font-bold uppercase tracking-wider text-slate-200">
              Full name
            </label>
            <div className="relative flex items-center">
              <User className="absolute left-3.5 h-4 w-4 text-slate-400" aria-hidden="true" />
              <input
                id="register-name"
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Your full name"
                autoComplete="name"
                maxLength={120}
                required
                className="w-full rounded-xl border border-white/15 bg-[#0B132B] py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[#47A5FF] focus:ring-1 focus:ring-[#47A5FF]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="register-email" className="block text-xs font-bold uppercase tracking-wider text-slate-200">
              Email address
            </label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3.5 h-4 w-4 text-slate-400" aria-hidden="true" />
              <input
                id="register-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                maxLength={254}
                required
                className="w-full rounded-xl border border-white/15 bg-[#0B132B] py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[#47A5FF] focus:ring-1 focus:ring-[#47A5FF]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="register-phone" className="block text-xs font-bold uppercase tracking-wider text-slate-200">
              Phone number
            </label>
            <div className="relative flex items-center">
              <Phone className="absolute left-3.5 h-4 w-4 text-slate-400" aria-hidden="true" />
              <input
                id="register-phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="0712345678 or +255712345678"
                autoComplete="tel"
                inputMode="tel"
                maxLength={24}
                required
                className="w-full rounded-xl border border-white/15 bg-[#0B132B] py-2.5 pl-10 pr-4 font-mono text-sm text-white outline-none placeholder:text-slate-500 focus:border-[#47A5FF] focus:ring-1 focus:ring-[#47A5FF]"
              />
            </div>
            <p className="text-[11px] text-slate-400">Format: 07XXXXXXXX or +2557XXXXXXXX</p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="register-password" className="block text-xs font-bold uppercase tracking-wider text-slate-200">
                Password
              </label>
              <div className="relative flex items-center">
                <Key className="absolute left-3.5 h-4 w-4 text-slate-400" aria-hidden="true" />
                <input
                  id="register-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  className="w-full rounded-xl border border-white/15 bg-[#0B132B] py-2.5 pl-10 pr-10 font-mono text-sm text-white outline-none placeholder:text-slate-500 focus:border-[#47A5FF]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 rounded p-1 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="register-confirm-password" className="block text-xs font-bold uppercase tracking-wider text-slate-200">
                Confirm password
              </label>
              <div className="relative flex items-center">
                <Key className="absolute left-3.5 h-4 w-4 text-slate-400" aria-hidden="true" />
                <input
                  id="register-confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  className="w-full rounded-xl border border-white/15 bg-[#0B132B] py-2.5 pl-10 pr-10 font-mono text-sm text-white outline-none placeholder:text-slate-500 focus:border-[#47A5FF]"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((visible) => !visible)}
                  aria-label={showConfirmPassword ? "Hide confirmation" : "Show confirmation"}
                  className="absolute right-3 rounded p-1 text-slate-400 hover:text-white"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-2.5 pt-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(event) => setAcceptedTerms(event.target.checked)}
              className="mt-0.5 rounded border-white/20 bg-[#0B132B] text-blue-600 focus:ring-[#47A5FF]"
            />
            <span>
              I accept the BIGsta Terms &amp; Conditions. New accounts receive the standard user role.
            </span>
          </label>

          {errorMessage && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/15 p-3 text-xs text-red-200" role="alert">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" aria-hidden="true" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-3 text-sm font-bold text-white shadow-lg transition-all hover:from-emerald-400 hover:to-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Creating account…" : <><CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Create account</>}
          </button>
        </form>
      </section>
    </div>
  );
};
